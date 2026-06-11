"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import { yearOf, yearRange } from "@/lib/format";
import type { OrcidImportResult, OrcidPreviewResult } from "@/lib/types";
import Drawer from "./Drawer";
import { Banner, Button, SectionHeading } from "./ui";

interface Row {
  title: string;
  sub: string;
  note?: string | null;
  mono?: string | null;
}

function Section({ label, rows }: { label: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-4">
      <SectionHeading className="mb-1.5">{label} ({rows.length})</SectionHeading>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={`${label}-${i}`} className="text-sm bg-dust-50 border border-dust-200 rounded-lg px-3 py-1.5">
            <div className="font-medium text-dust-900 truncate" title={r.title}>{r.title}</div>
            {r.sub && <div className="text-xs text-dust-600 truncate">{r.sub}</div>}
            {r.note && <p className="text-xs text-dust-600 mt-0.5 line-clamp-2">{r.note}</p>}
            {r.mono && <div className="text-xs text-dust-500 font-mono truncate">{r.mono}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  orcidId: string;
  preview: OrcidPreviewResult;
  onClose: () => void;
  onImported: () => void;
}

export default function OrcidImportModal({ orcidId, preview, onClose, onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrcidImportResult | null>(null);

  const person = preview.person;
  const totalFound = preview.publications.length + preview.projects.length + preview.experiences.length;

  const pubRows: Row[] = preview.publications.map((p) => ({
    title: p.title,
    sub: [p.type, p.publisher, yearOf(p.publication_date)].filter(Boolean).join(" · "),
    note: p.abstract,
    mono: p.doi ? TEXT.orcid.doi(p.doi) : null,
  }));
  const projRows: Row[] = preview.projects.map((p) => ({
    title: p.title,
    sub: [p.agency, yearRange(p.start_date, p.end_date)].filter(Boolean).join(" · "),
    mono: p.grant_number ? TEXT.orcid.grant(p.grant_number) : null,
  }));
  const expRows: Row[] = preview.experiences.map((e) => ({
    title: e.role_title || e.organization,
    sub: [e.role_title ? e.organization : null, yearRange(e.start_date, e.end_date, e.is_current)]
      .filter(Boolean)
      .join(" · "),
  }));

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      const res = await api<OrcidImportResult>("POST", "/api/orcid/import", {
        orcid_id: orcidId,
        publications: preview.publications,
        projects: preview.projects,
        experiences: preview.experiences,
      });
      setResult(res);
      onImported();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  const footer = (
    <>
      <div className="flex-1" />
      {result ? (
        <Button onClick={onClose}>{TEXT.orcid.done}</Button>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{TEXT.orcid.back}</Button>
          <Button onClick={handleConfirm} disabled={loading || totalFound === 0}>
            {loading ? TEXT.orcid.importing : TEXT.orcid.importN(totalFound)}
          </Button>
        </>
      )}
    </>
  );

  return (
    <Drawer title={TEXT.orcid.title} onClose={onClose} footer={footer}>
      {error && <Banner tone="error" className="mb-4">{error}</Banner>}

      {result ? (
        <Banner tone="success">{TEXT.orcid.result(result)}</Banner>
      ) : (
        <>
          {person && (
            <div className="bg-dust-100 border border-dust-300 rounded-lg p-3 space-y-1 mb-4">
              <div className="text-sm font-semibold">{person.name || orcidId}</div>
              <div className="text-xs text-dust-600">
                {orcidId}
                {person.country ? ` · ${person.country}` : ""}
              </div>
              {person.biography && <p className="text-xs text-dust-600 line-clamp-3">{person.biography}</p>}
              {person.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {person.keywords.map((k, i) => (
                    <span key={i} className="text-xs text-dust-700 bg-dust-200 rounded px-1.5 py-0.5">{k}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-dust-500 pt-0.5">{TEXT.orcid.isThisYou}</p>
            </div>
          )}

          {totalFound === 0 ? (
            <p className="text-sm text-dust-600">{TEXT.orcid.noRecords}</p>
          ) : (
            <>
              <p className="text-xs text-dust-600 mb-4">{TEXT.orcid.found(totalFound)}</p>
              <Section label={TEXT.orcid.publications} rows={pubRows} />
              <Section label={TEXT.orcid.projects} rows={projRows} />
              <Section label={TEXT.orcid.experiences} rows={expRows} />
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
