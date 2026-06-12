"use client";

import { useMemo, useState } from "react";
import { api, apiBlob, errMsg } from "@/lib/api";
import { STATUS_TONES, TEXT } from "@/lib/constants";
import { ENTITIES, ENTITY_ORDER } from "@/lib/entities";
import { download } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import type { AnyRecord, Department, ExportRequest, User } from "@/lib/types";
import RecordForm from "./RecordForm";
import Icon from "./icons";
import { Button, Loading, PageTitle, Pill, SectionHeading } from "./ui";

interface UnifiedRecord {
  record: AnyRecord;
  entityKey: string;
}

interface RowProps {
  item: UnifiedRecord;
  isOwn: boolean;
  checked: boolean;
  owner?: User;
  ownerDept?: Department;
  onToggle: () => void;
  onOpen: () => void;
}

function RecordRow({ item, isOwn, checked, owner, ownerDept, onToggle, onOpen }: RowProps) {
  const cfg = ENTITIES[item.entityKey];
  const d = cfg.display(item.record);
  const status = String((item.record as unknown as Record<string, unknown>).status || "").toLowerCase();
  const tone = STATUS_TONES[status];

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-3 py-3 border-b border-dust-200 rounded-lg hover:bg-dust-100 cursor-pointer transition-colors"
    >
      {isOwn && (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => { e.stopPropagation(); onToggle(); }}
          onClick={(e) => e.stopPropagation()}
          className="size-4 accent-hunter cursor-pointer shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{d.title}</div>
        <div className="text-xs text-dust-600 truncate mt-1">
          <span className="font-semibold text-dust-700">{cfg.singular}</span>
          {d.sub && d.sub !== "—" ? <span> · {d.sub}</span> : null}
        </div>
      </div>
      {tone && <Pill tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</Pill>}
      {isOwn ? (
        d.date && <div className="hidden sm:block font-mono text-xs text-dust-600 shrink-0">{d.date}</div>
      ) : (
        <div className="text-right shrink-0">
          <div className="text-xs font-medium text-dust-700">{owner?.name || ""}</div>
          {ownerDept && <div className="text-xs text-dust-600 mt-0.5">{ownerDept.name}</div>}
        </div>
      )}
    </div>
  );
}

interface Props {
  user: User;
  refreshKey?: number;
}

export default function LibrarySection({ user, refreshKey }: Props) {
  const { data: context } = useLoad(() =>
    Promise.all([
      api<User[]>("GET", "/api/users").catch(() => []),
      api<Department[]>("GET", "/api/departments").catch(() => []),
    ]),
  );
  const userMap = useMemo(() => new Map((context?.[0] ?? []).map((u) => [u.id, u])), [context]);
  const deptMap = useMemo(() => new Map((context?.[1] ?? []).map((d) => [d.id, d])), [context]);

  const { data: byEntity, loading, reload } = useLoad(async () => {
    const lists = await Promise.all(
      ENTITY_ORDER.map((key) => api<AnyRecord[]>("GET", ENTITIES[key].endpoint).catch(() => [])),
    );
    return Object.fromEntries(ENTITY_ORDER.map((key, i) => [key, lists[i]]));
  }, [refreshKey]);

  const [editing, setEditing] = useState<{ entityKey: string; record: AnyRecord | null; viewOnly: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [exportError, setExportError] = useState("");

  const all = useMemo<UnifiedRecord[]>(
    () => ENTITY_ORDER.flatMap((key) => (byEntity?.[key] ?? []).map((record) => ({ record, entityKey: key }))),
    [byEntity],
  );
  const own = useMemo(() => all.filter((u) => u.record.user_id === user.id), [all, user.id]);
  const others = useMemo(() => all.filter((u) => u.record.user_id !== user.id), [all, user.id]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleExport() {
    setExportError("");
    const body: ExportRequest = { publication_ids: [], project_ids: [], proposal_ids: [], experience_ids: [] };
    for (const { record, entityKey } of own) {
      if (selected.has(record.id)) body[ENTITIES[entityKey].exportKey].push(record.id);
    }
    try {
      download(await apiBlob("POST", "/api/export", body), TEXT.library.exportFilename());
    } catch (err: unknown) {
      setExportError(errMsg(err));
    }
  }

  function openEditor(item: UnifiedRecord, isOwn: boolean) {
    setEditing({ entityKey: item.entityKey, record: item.record, viewOnly: !isOwn });
  }

  const editingCfg = editing ? ENTITIES[editing.entityKey] : null;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <PageTitle>{TEXT.library.title}</PageTitle>
        <div className="relative flex gap-2.5 shrink-0">
          {selected.size > 0 && (
            <Button variant="outline" onClick={handleExport}>{TEXT.library.export(selected.size)}</Button>
          )}
          <Button onClick={() => setNewOpen((v) => !v)} className="flex items-center gap-2">
            {TEXT.library.newRecord}
          </Button>
          {newOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNewOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-dust-300 rounded-xl p-1 shadow-menu z-40">
                {ENTITY_ORDER.map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setNewOpen(false);
                      setEditing({ entityKey: key, record: null, viewOnly: false });
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm text-dust-900 hover:bg-dust-100 transition-colors"
                  >
                    <span className="text-moss flex"><Icon name={ENTITIES[key].icon} /></span>
                    <span>{ENTITIES[key].singular}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {exportError && <p className="text-xs text-clay mt-3">{exportError}</p>}

      {loading ? (
        <Loading />
      ) : all.length === 0 ? (
        <p className="text-sm text-dust-500 py-6">{TEXT.library.empty}</p>
      ) : (
        <div>
          {own.length > 0 && (
            <section className="mt-9">
              <SectionHeading className="mb-1.5">{TEXT.library.yourRecords(own.length)}</SectionHeading>
              {own.map((item) => (
                <RecordRow
                  key={item.record.id}
                  item={item}
                  isOwn={true}
                  checked={selected.has(item.record.id)}
                  onToggle={() => toggleSelect(item.record.id)}
                  onOpen={() => openEditor(item, true)}
                />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="mt-9">
              <SectionHeading className="mb-1.5">{TEXT.library.institutionRecords(others.length)}</SectionHeading>
              {others.map((item) => {
                const owner = userMap.get(item.record.user_id);
                return (
                  <RecordRow
                    key={item.record.id}
                    item={item}
                    isOwn={false}
                    checked={false}
                    owner={owner}
                    ownerDept={owner?.department_id ? deptMap.get(owner.department_id) : undefined}
                    onToggle={() => { }}
                    onOpen={() => openEditor(item, false)}
                  />
                );
              })}
            </section>
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
          onSaved={() => { setEditing(null); reload(); }}
          viewOnly={editing.viewOnly}
        />
      )}
    </div>
  );
}
