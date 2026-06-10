"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  GENERIC_FAIL_MSG,
  type OrcidImportResult,
  type OrcidPreviewResult,
} from "@/lib/types";

interface Props {
  orcidId: string;
  preview: OrcidPreviewResult;
  onClose: () => void;
  onImported: () => void;
}

const yr = (d: string | null): string | null => (d ? d.slice(0, 4) : null);

function yearRange(start: string | null, end: string | null, current = false): string | null {
  const s = yr(start);
  const e = current ? "Present" : yr(end);
  if (s && e) return `${s}–${e}`;
  return s || e || null;
}

interface Row {
  title: string;
  sub: string;
  note?: string | null;
  mono?: string | null;
}

export default function OrcidImportModal({ orcidId, preview, onClose, onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrcidImportResult | null>(null);

  const person = preview.person;
  const totalFound =
    preview.publications.length + preview.projects.length + preview.experiences.length;

  const pubRows: Row[] = preview.publications.map((p) => ({
    title: p.title,
    sub: [p.type, p.publisher, yr(p.publication_date)].filter(Boolean).join(" · "),
    note: p.abstract,
    mono: p.doi ? `DOI: ${p.doi}` : null,
  }));
  const projRows: Row[] = preview.projects.map((p) => ({
    title: p.title,
    sub: [p.agency, yearRange(p.start_date, p.end_date)].filter(Boolean).join(" · "),
    mono: p.grant_number ? `Grant: ${p.grant_number}` : null,
  }));
  const expRows: Row[] = preview.experiences.map((e) => ({
    title: e.role_title || e.organization,
    sub: [
      e.role_title ? e.organization : null,
      yearRange(e.start_date, e.end_date, e.is_current),
    ]
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
      setError(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    } finally {
      setLoading(false);
    }
  }

  function Section({ label, rows }: { label: string; rows: Row[] }) {
    if (rows.length === 0) return null;
    return (
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
          {label} ({rows.length})
        </h4>
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li
              key={`${label}-${i}`}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <div className="font-medium text-gray-800 truncate" title={r.title}>
                {r.title}
              </div>
              {r.sub && <div className="text-xs text-gray-500 truncate">{r.sub}</div>}
              {r.note && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.note}</p>}
              {r.mono && <div className="text-[11px] text-gray-400 font-mono truncate">{r.mono}</div>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Import from ORCID</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {result ? (
            /* Done */
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Imported {result.publications_imported} publications,{" "}
              {result.projects_imported} projects, {result.experiences_imported} experiences
              {" "}· skipped {result.skipped} duplicates.
            </div>
          ) : (
            /* Preview */
            <>
              {person && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-semibold text-gray-900">{person.name || orcidId}</div>
                  <div className="text-xs text-gray-500">
                    {orcidId}
                    {person.country ? ` · ${person.country}` : ""}
                  </div>
                  {person.biography && (
                    <p className="text-xs text-gray-600 line-clamp-3">{person.biography}</p>
                  )}
                  {person.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {person.keywords.map((k, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-indigo-700 bg-indigo-100 rounded px-1.5 py-0.5"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 pt-0.5">
                    Is this you? Review the records below before importing.
                  </p>
                </div>
              )}

              {totalFound === 0 ? (
                <p className="text-sm text-gray-500">No records found on this ORCID profile.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Found {totalFound} record{totalFound === 1 ? "" : "s"}. Any already in your
                    library are skipped automatically.
                  </p>
                  <Section label="Publications" rows={pubRows} />
                  <Section label="Projects" rows={projRows} />
                  <Section label="Experiences" rows={expRows} />
                </>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
          <div className="flex-1" />
          {result ? (
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || totalFound === 0}
                className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Importing…" : `Import ${totalFound}`}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
