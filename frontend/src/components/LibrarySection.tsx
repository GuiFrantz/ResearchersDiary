"use client";

import { useState, useEffect, useCallback } from "react";
import { api, apiBlob } from "@/lib/api";
import type {
  User, Department, AnyRecord, ExportRequest, Institution,
  DepartmentReport, InstitutionReport,
} from "@/lib/types";
import RecordForm, { type FieldDef } from "./RecordForm";


interface EntityConfig {
  label: string;
  singular: string;
  endpoint: string;
  exportKey: keyof ExportRequest;
  display: (r: AnyRecord) => { title: string; sub: string };
  fields: FieldDef[];
}

const ENTITIES: Record<string, EntityConfig> = {
  publications: {
    label: "Publications", singular: "Publication", endpoint: "/api/publications", exportKey: "publication_ids",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return { title: String(p.title || "—"), sub: [p.type, p.publisher].filter(Boolean).join(" · ") || "—" };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "type", label: "Type", type: "select", opts: ["Article", "Book", "Conference", "Chapter", "Thesis", "Other"] },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "doi", label: "DOI", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "publication_date", label: "Date", type: "date" },
      { name: "status", label: "Status", type: "text" },
      { name: "visibility", label: "Visibility", type: "select", opts: ["private", "institution"], required: true },
    ],
  },
  projects: {
    label: "Projects", singular: "Project", endpoint: "/api/projects", exportKey: "project_ids",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return { title: String(p.title || "—"), sub: String(p.agency || "—") };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "agency", label: "Agency", type: "text" },
      { name: "grant_number", label: "Grant No.", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "status", label: "Status", type: "select", opts: ["active", "concluded", "canceled"] },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "budget", label: "Budget", type: "number" },
      { name: "visibility", label: "Visibility", type: "select", opts: ["private", "institution"], required: true },
    ],
  },
  proposals: {
    label: "Proposals", singular: "Proposal", endpoint: "/api/proposals", exportKey: "proposal_ids",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return { title: String(p.title || "—"), sub: String(p.funding_body || "—") };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "funding_body", label: "Funding Body", type: "text" },
      { name: "reference", label: "Reference", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "status", label: "Status", type: "select", opts: ["draft", "submitted", "approved", "denied"] },
      { name: "submission_date", label: "Submission Date", type: "date" },
      { name: "decision_date", label: "Decision Date", type: "date" },
      { name: "visibility", label: "Visibility", type: "select", opts: ["private", "institution"], required: true },
    ],
  },
  experiences: {
    label: "Experiences", singular: "Experience", endpoint: "/api/experiences", exportKey: "experience_ids",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return { title: String(p.role_title || p.category || "—"), sub: String(p.organization || "—") };
    },
    fields: [
      { name: "category", label: "Category", type: "select", opts: ["Teaching", "Supervision", "Mentoring", "Industry", "Research", "Other"] },
      { name: "organization", label: "Organization", type: "text" },
      { name: "role_title", label: "Role Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "is_current", label: "Current Position", type: "checkbox" },
      { name: "visibility", label: "Visibility", type: "select", opts: ["private", "institution"], required: true },
    ],
  },
};

const ROLE_LEVEL: Record<string, number> = { researcher: 0, department_head: 1, institution_head: 2, admin: 3 };


function formatDeptReport(r: DepartmentReport): string {
  let t = "";
  t += `DEPARTMENT REPORT\n`;
  t += `${"=".repeat(50)}\n\n`;
  t += `Department:   ${r.department.name}${r.department.code ? ` (${r.department.code})` : ""}\n`;
  t += `Institution:  ${r.institution.name}\n`;
  t += `Researchers:  ${r.researcher_count}\n`;
  t += `Generated:    ${new Date(r.generated_at).toLocaleString()}\n\n`;

  t += `SUMMARY\n${"-".repeat(30)}\n`;
  t += `  Publications:  ${r.publications.total}\n`;
  t += `  Projects:      ${r.projects.total}\n`;
  t += `  Proposals:     ${r.proposals.total}\n\n`;

  if (Object.keys(r.publications.by_type).length > 0) {
    t += `Publications by Type\n`;
    Object.entries(r.publications.by_type).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.publications.by_status).length > 0) {
    t += `Publications by Status\n`;
    Object.entries(r.publications.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.projects.by_status).length > 0) {
    t += `Projects by Status\n`;
    Object.entries(r.projects.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.proposals.by_status).length > 0) {
    t += `Proposals by Status\n`;
    Object.entries(r.proposals.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }

  if (r.researchers.length > 0) {
    t += `PER-RESEARCHER BREAKDOWN\n${"-".repeat(30)}\n`;
    r.researchers.forEach((res) => {
      t += `  ${res.name || "—"}: ${res.publication_count} pubs, ${res.project_count} projs, ${res.proposal_count} props, ${res.experience_count} exps\n`;
    });
  }
  return t;
}

function formatInstReport(r: InstitutionReport): string {
  let t = "";
  t += `INSTITUTION REPORT\n`;
  t += `${"=".repeat(50)}\n\n`;
  t += `Institution:  ${r.institution.name}\n`;
  t += `Departments:  ${r.department_count}\n`;
  t += `Researchers:  ${r.total_researchers}\n`;
  t += `Generated:    ${new Date(r.generated_at).toLocaleString()}\n\n`;

  t += `INSTITUTION TOTALS\n${"-".repeat(30)}\n`;
  t += `  Publications:  ${r.institution_totals.publications.total}\n`;
  t += `  Projects:      ${r.institution_totals.projects.total}\n`;
  t += `  Proposals:     ${r.institution_totals.proposals.total}\n\n`;

  r.departments.forEach((dept) => {
    t += `DEPARTMENT: ${dept.name}${dept.code ? ` (${dept.code})` : ""}\n${"-".repeat(30)}\n`;
    t += `  Researchers:   ${dept.researcher_count}\n`;
    t += `  Publications:  ${dept.publications.total}\n`;
    t += `  Projects:      ${dept.projects.total}\n`;
    t += `  Proposals:     ${dept.proposals.total}\n\n`;
  });
  return t;
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props { user: User; }

export default function LibrarySection({ user }: Props) {
  const [tab, setTab] = useState("publications");
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [deptMap, setDeptMap] = useState<Map<string, Department>>(new Map());
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ record: AnyRecord | null; viewOnly: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");

  const config = ENTITIES[tab];
  const canReport = ROLE_LEVEL[user.role] >= 1;

  useEffect(() => {
    async function loadContext() {
      try { const u = await api<User[]>("GET", "/api/users"); setUserMap(new Map(u.map(x => [x.id, x]))); } catch {}
      try { const d = await api<Department[]>("GET", "/api/departments"); setDeptMap(new Map(d.map(x => [x.id, x]))); } catch {}
      if (user.role === "admin") {
        try { const i = await api<Institution[]>("GET", "/api/institutions"); setInstitutions(i); } catch {}
      }
    }
    loadContext();
  }, [user.role]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecords(await api<AnyRecord[]>("GET", config.endpoint)); } catch {}
    setLoading(false);
  }, [config.endpoint]);

  useEffect(() => { load(); }, [load]);

  const ownRecords = records.filter((r) => r.user_id === user.id);
  const otherRecords = records.filter((r) => {
    if (r.user_id === user.id) return false;
    // When admin has an institution selected, filter visible records to that institution
    if (user.role === "admin" && selectedInstId) {
      const owner = userMap.get(r.user_id);
      return owner?.institution_id === selectedInstId;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Export: collect selected IDs grouped by entity type, download JSON
  async function handleExport() {
    const body: ExportRequest = { publication_ids: [], project_ids: [], proposal_ids: [], experience_ids: [] };
    // We need to know which type each selected ID belongs to — fetch all types
    const allRecords = new Map<string, string>(); // id → entity key
    for (const [key, cfg] of Object.entries(ENTITIES)) {
      try {
        const recs = await api<AnyRecord[]>("GET", cfg.endpoint);
        recs.filter(r => r.user_id === user.id).forEach(r => allRecords.set(r.id, key));
      } catch {}
    }
    selected.forEach((id) => {
      const key = allRecords.get(id);
      if (key) body[ENTITIES[key].exportKey].push(id);
    });
    try {
      const blob = await apiBlob("POST", "/api/export", body);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleReport() {
    try {
      if (user.role === "department_head" && user.department_id) {
        const r = await api<DepartmentReport>("GET", `/api/reports/department/${user.department_id}`);
        downloadText(formatDeptReport(r), `department_report.txt`);
      } else if (user.role === "institution_head" && user.institution_id) {
        const r = await api<InstitutionReport>("GET", `/api/reports/institution/${user.institution_id}`);
        downloadText(formatInstReport(r), `institution_report.txt`);
      } else if (user.role === "admin" && selectedInstId) {
        const r = await api<InstitutionReport>("GET", `/api/reports/institution/${selectedInstId}`);
        downloadText(formatInstReport(r), `institution_report.txt`);
      }
    } catch {}
  }

  function RecordRow({ r, isOwn }: { r: AnyRecord; isOwn: boolean }) {
    const d = config.display(r);
    const owner = !isOwn ? userMap.get(r.user_id) : null;
    const ownerDept = owner?.department_id ? deptMap.get(owner.department_id) : null;

    return (
      <div
        onClick={() => setEditing({ record: r, viewOnly: !isOwn })}
        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
      >
        {isOwn && (
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-indigo-600 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
          <div className="text-xs text-gray-400 truncate">{d.sub}</div>
        </div>
        <div className="text-right shrink-0">
          {isOwn ? null : (
            <>
              <div className="text-xs font-medium text-gray-500">{owner?.name || ""}</div>
              {ownerDept && <div className="text-xs text-gray-400">{ownerDept.name}</div>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {Object.entries(ENTITIES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setEditing(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === key ? "bg-indigo-100 text-indigo-700 font-medium" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Header row: title + action buttons */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{config.label}</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleExport}
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Export ({selected.size})
            </button>
          )}
          {canReport && (
            user.role === "admin" ? (
              <div className="flex items-center gap-1">
                <select
                  value={selectedInstId}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  className="text-sm px-2 py-1.5 border border-gray-300 rounded-lg"
                >
                  <option value="">Institution...</option>
                  {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <button
                  onClick={handleReport}
                  disabled={!selectedInstId}
                  className="text-sm px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                >
                  Generate Report
                </button>
              </div>
            ) : (
              <button
                onClick={handleReport}
                className="text-sm px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
              >
                Generate Report
              </button>
            )
          )}
          <button
            onClick={() => setEditing({ record: null, viewOnly: false })}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New {config.singular}
          </button>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No {config.label.toLowerCase()} found.</p>
      ) : (
        <div className="space-y-4">
          {ownRecords.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Your Records ({ownRecords.length})</h3>
              <div className="space-y-1">{ownRecords.map((r) => <RecordRow key={r.id} r={r} isOwn={true} />)}</div>
            </div>
          )}
          {otherRecords.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Visible Records ({otherRecords.length})</h3>
              <div className="space-y-1">{otherRecords.map((r) => <RecordRow key={r.id} r={r} isOwn={false} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Form panel */}
      {editing !== null && (
        <RecordForm
          entity={config.singular}
          endpoint={config.endpoint}
          fields={config.fields}
          record={editing.record}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          viewOnly={editing.viewOnly}
        />
      )}
    </div>
  );
}
