import os
from datetime import date
from typing import Optional

import httpx

if os.environ.get("ORCID_ENV", "production").lower() == "sandbox":
    ORCID_OAUTH_URL = "https://sandbox.orcid.org/oauth/token"
    ORCID_API_BASE = "https://pub.sandbox.orcid.org/v3.0"
else:
    ORCID_OAUTH_URL = "https://orcid.org/oauth/token"
    ORCID_API_BASE = "https://pub.orcid.org/v3.0"

TYPE_MAP = {
    "journal-article": "Article",
    "book": "Book",
    "conference-paper": "Conference",
    "book-chapter": "Chapter",
    "dissertation-thesis": "Thesis",
}

_token_cache: Optional[str] = None


class OrcidError(Exception):
    def __init__(self, kind: str):
        self.kind = kind
        super().__init__(kind)


async def _get_token(force_refresh: bool = False) -> str:
    global _token_cache
    if _token_cache and not force_refresh:
        return _token_cache

    client_id = os.environ.get("ORCID_CLIENT_ID")
    client_secret = os.environ.get("ORCID_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise OrcidError("not_configured")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                ORCID_OAUTH_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials",
                    "scope": "/read-public",
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            _token_cache = resp.json()["access_token"]
            return _token_cache
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise OrcidError("unavailable") from exc


async def _fetch_json(orcid_id: str, section: str) -> dict:
    for attempt in range(2):
        token = await _get_token(force_refresh=attempt == 1)
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{ORCID_API_BASE}/{orcid_id}/{section}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                    },
                )
        except httpx.HTTPError as exc:
            raise OrcidError("unavailable") from exc

        if resp.status_code == 401 and attempt == 0:
            continue
        if resp.status_code == 404:
            raise OrcidError("not_found")
        if not resp.is_success:
            raise OrcidError("unavailable")
        try:
            return resp.json()
        except ValueError as exc:
            raise OrcidError("unavailable") from exc

    raise OrcidError("unavailable")


def _value(node: Optional[dict]) -> Optional[str]:
    if not node:
        return None
    val = node.get("value")
    return str(val) if val not in (None, "") else None


def _parse_date(node: Optional[dict]) -> Optional[date]:
    if not node:
        return None
    year = _value(node.get("year"))
    if not year:
        return None
    month = _value(node.get("month")) or "1"
    day = _value(node.get("day")) or "1"
    try:
        return date(int(year), int(month), int(day))
    except (ValueError, TypeError):
        return None


def _extract_external_id(summary: dict, id_type: str) -> Optional[str]:
    ext = (summary.get("external-ids") or {}).get("external-id") or []
    for eid in ext:
        if eid.get("external-id-type") == id_type:
            return _value({"value": eid.get("external-id-value")})
    return None


def _map_work(summary: dict) -> Optional[dict]:
    title = _value(((summary.get("title") or {}).get("title")))
    if not title:
        return None
    work_type = summary.get("type")
    return {
        "title": title,
        "type": TYPE_MAP.get(work_type, "Other") if work_type else None,
        "publication_date": _parse_date(summary.get("publication-date")),
        "publisher": _value(summary.get("journal-title")),
        "doi": _extract_external_id(summary, "doi"),
        "url": _value(summary.get("url")),
    }


def _map_funding(summary: dict) -> Optional[dict]:
    title = _value(((summary.get("title") or {}).get("title")))
    if not title:
        return None
    organization = summary.get("organization") or {}
    return {
        "title": title,
        "agency": organization.get("name"),
        "grant_number": _extract_external_id(summary, "grant_number"),
        "start_date": _parse_date(summary.get("start-date")),
        "end_date": _parse_date(summary.get("end-date")),
    }


def _map_person(data: dict) -> dict:
    name = data.get("name") or {}
    full = (
        _value(name.get("credit-name"))
        or " ".join(
            p
            for p in (_value(name.get("given-names")), _value(name.get("family-name")))
            if p
        )
        or None
    )
    country = None
    for addr in (data.get("addresses") or {}).get("address") or []:
        country = _value(addr.get("country"))
        if country:
            break
    keywords = [
        k["content"]
        for k in (data.get("keywords") or {}).get("keyword") or []
        if k.get("content")
    ]
    return {
        "name": full,
        "biography": (data.get("biography") or {}).get("content") or None,
        "country": country,
        "keywords": keywords,
    }


def _map_employment(summary: dict) -> Optional[dict]:
    organization = (summary.get("organization") or {}).get("name")
    if not organization:
        return None
    end_date = _parse_date(summary.get("end-date"))
    return {
        "organization": organization,
        "role_title": summary.get("role-title"),
        "description": summary.get("department-name"),
        "start_date": _parse_date(summary.get("start-date")),
        "end_date": end_date,
        "is_current": end_date is None,
    }


ORCID_BULK_MAX = 100


async def _fetch_abstracts(orcid_id: str, put_codes: list) -> dict:
    codes = [str(pc) for pc in put_codes if pc is not None]
    if not codes:
        return {}
    try:
        token = await _get_token()
    except OrcidError:
        return {}

    abstracts: dict = {}
    async with httpx.AsyncClient(timeout=15) as client:
        for start in range(0, len(codes), ORCID_BULK_MAX):
            chunk = codes[start : start + ORCID_BULK_MAX]
            try:
                resp = await client.get(
                    f"{ORCID_API_BASE}/{orcid_id}/works/{','.join(chunk)}",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                    },
                )
            except httpx.HTTPError:
                continue
            if not resp.is_success:
                continue
            try:
                data = resp.json()
            except ValueError:
                continue
            for item in data.get("bulk") or []:
                work = item.get("work")
                if not work:
                    continue
                pc = work.get("put-code")
                desc = work.get("short-description")
                if pc is not None and desc:
                    abstracts[str(pc)] = desc
    return abstracts


async def fetch_person(orcid_id: str) -> Optional[dict]:
    try:
        return _map_person(await _fetch_json(orcid_id, "person"))
    except OrcidError:
        return None


async def fetch_works(orcid_id: str) -> list[dict]:
    data = await _fetch_json(orcid_id, "works")
    works: list[dict] = []
    put_codes: list = []
    for group in data.get("group") or []:
        summaries = group.get("work-summary") or []
        if not summaries:
            continue
        summary = summaries[0]
        mapped = _map_work(summary)
        if mapped:
            works.append(mapped)
            put_codes.append(summary.get("put-code"))

    abstracts = await _fetch_abstracts(orcid_id, put_codes)
    for work, pc in zip(works, put_codes):
        work["abstract"] = abstracts.get(str(pc)) if pc is not None else None
    return works


async def fetch_fundings(orcid_id: str) -> list[dict]:
    data = await _fetch_json(orcid_id, "fundings")
    projects: list[dict] = []
    for group in data.get("group") or []:
        summaries = group.get("funding-summary") or []
        if not summaries:
            continue
        mapped = _map_funding(summaries[0])
        if mapped:
            projects.append(mapped)
    return projects


async def fetch_employments(orcid_id: str) -> list[dict]:
    data = await _fetch_json(orcid_id, "employments")
    experiences: list[dict] = []
    for group in data.get("affiliation-group") or []:
        summaries = group.get("summaries") or []
        if not summaries:
            continue
        employment = (summaries[0] or {}).get("employment-summary")
        if not employment:
            continue
        mapped = _map_employment(employment)
        if mapped:
            experiences.append(mapped)
    return experiences
