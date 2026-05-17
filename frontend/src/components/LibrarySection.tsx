"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import { api, apiBlob } from "@/lib/api";
import type {
  User, Department, AnyRecord, ExportRequest,
} from "@/lib/types";
import RecordForm, { type FieldDef } from "./RecordForm";


interface EntityConfig {
  label: string;
  singular: string;
  endpoint: string;
  exportKey: keyof ExportRequest;
  icon: string;
  display: (r: AnyRecord) => { title: string; sub: string };
  fields: FieldDef[];
}

const ENTITIES: Record<string, EntityConfig> = {
  publications: {
    label: "Publications", singular: "Publication", endpoint: "/api/publications",
    exportKey: "publication_ids", icon: "📄",
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
    label: "Projects", singular: "Project", endpoint: "/api/projects",
    exportKey: "project_ids", icon: "🧪",
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
    label: "Proposals", singular: "Proposal", endpoint: "/api/proposals",
    exportKey: "proposal_ids", icon: "📝",
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
    label: "Experiences", singular: "Experience", endpoint: "/api/experiences",
    exportKey: "experience_ids", icon: "💼",
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

const ENTITY_ORDER: Array<keyof typeof ENTITIES> = ["publications", "projects", "proposals", "experiences"];

interface UnifiedRecord {
  record: AnyRecord;
  entityKey: string;
}

interface Props { user: User; }

export default function LibrarySection({ user }: Props) {
  const [byEntity, setByEntity] = useState<Record<string, AnyRecord[]>>({});
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [deptMap, setDeptMap] = useState<Map<string, Department>>(new Map());
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ entityKey: string; record: AnyRecord | null; viewOnly: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    async function loadContext() {
      try { const u = await api<User[]>("GET", "/api/users"); setUserMap(new Map(u.map(x => [x.id, x]))); } catch {}
      try { const d = await api<Department[]>("GET", "/api/departments"); setDeptMap(new Map(d.map(x => [x.id, x]))); } catch {}
    }
    loadContext();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const next: Record<string, AnyRecord[]> = {};
    await Promise.all(
      ENTITY_ORDER.map(async (key) => {
        try {
          next[key] = await api<AnyRecord[]>("GET", ENTITIES[key].endpoint);
        } catch {
          next[key] = [];
        }
      }),
    );
    setByEntity(next);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const all = useMemo<UnifiedRecord[]>(() => {
    const out: UnifiedRecord[] = [];
    for (const key of ENTITY_ORDER) {
      for (const r of byEntity[key] ?? []) out.push({ record: r, entityKey: key });
    }
    return out;
  }, [byEntity]);

  const ownAll = useMemo(() => all.filter((u) => u.record.user_id === user.id), [all, user.id]);
  const otherAll = useMemo(() => all.filter((u) => u.record.user_id !== user.id), [all, user.id]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    const body: ExportRequest = { publication_ids: [], project_ids: [], proposal_ids: [], experience_ids: [] };
    const ownIdToEntity = new Map<string, string>();
    for (const u of ownAll) ownIdToEntity.set(u.record.id, u.entityKey);
    selected.forEach((id) => {
      const key = ownIdToEntity.get(id);
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

  function RecordRow({ item, isOwn }: { item: UnifiedRecord; isOwn: boolean }) {
    const cfg = ENTITIES[item.entityKey];
    const d = cfg.display(item.record);
    const owner = !isOwn ? userMap.get(item.record.user_id) : null;
    const ownerDept = owner?.department_id ? deptMap.get(owner.department_id) : null;

    return (
      <div
        onClick={() => setEditing({ entityKey: item.entityKey, record: item.record, viewOnly: !isOwn })}
        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors"
      >
        {isOwn && (
          <input
            type="checkbox"
            checked={selected.has(item.record.id)}
            onChange={(e) => { e.stopPropagation(); toggleSelect(item.record.id); }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-indigo-600 shrink-0"
          />
        )}
        <span className="text-lg shrink-0" title={cfg.singular}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
          <div className="text-xs text-gray-400 truncate">
            <span className="text-gray-500">{cfg.singular}</span>
            {d.sub && d.sub !== "—" ? <span> · {d.sub}</span> : null}
          </div>
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

  const editingCfg = editing ? ENTITIES[editing.entityKey] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Library</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleExport}
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Export ({selected.size})
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setNewOpen((v) => !v)}
              className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New ▾
            </button>
            {newOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNewOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                  {ENTITY_ORDER.map((key) => {
                    const cfg = ENTITIES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setNewOpen(false);
                          setEditing({ entityKey: key, record: null, viewOnly: false });
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span>{cfg.singular}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading...</p>
      ) : all.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No records yet. Click + New to create one.</p>
      ) : (
        <div className="space-y-4">
          {ownAll.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Your Records ({ownAll.length})</h3>
              <div className="space-y-1">
                {ownAll.map((item) => <RecordRow key={item.record.id} item={item} isOwn={true} />)}
              </div>
            </div>
          )}
          {otherAll.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Visible Records ({otherAll.length})</h3>
              <div className="space-y-1">
                {otherAll.map((item) => <RecordRow key={item.record.id} item={item} isOwn={false} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {editing !== null && editingCfg && (
        <RecordForm
          entity={editingCfg.singular}
          endpoint={editingCfg.endpoint}
          fields={editingCfg.fields}
          record={editing.record}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          viewOnly={editing.viewOnly}
        />
      )}
    </div>
  );
}
