"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, type Invitation } from "@/lib/types";

interface Props {
  onAccepted: () => void;
}

export default function Inbox({ onAccepted }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Invitation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorByItem, setErrorByItem] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await api<Invitation[]>("GET", "/api/invitations/received");
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(inv: Invitation) {
    const lines = [
      `Accept this invitation to ${inv.institution_name ?? "the institution"}`
        + (inv.department_name ? ` (${inv.department_name})` : "")
        + `?`,
      "",
      `Your role will be set to ${ROLE_LABELS[inv.role] ?? inv.role}.`,
      "A user can only belong to one institution at a time:",
      "  • If you're not in one yet, you'll join this one.",
      "  • If you're already in another institution, you'll leave it.",
      "Your personal records (publications, projects, etc.) stay with you.",
    ];
    if (!window.confirm(lines.join("\n"))) return;
    setBusyId(inv.id);
    setErrorByItem((m) => ({ ...m, [inv.id]: "" }));
    try {
      await api("POST", `/api/invitations/${inv.id}/accept`);
      setItems((cur) => cur.filter((i) => i.id !== inv.id));
      onAccepted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept";
      setErrorByItem((m) => ({ ...m, [inv.id]: msg }));
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    setErrorByItem((m) => ({ ...m, [id]: "" }));
    try {
      await api("POST", `/api/invitations/${id}/decline`);
      setItems((cur) => cur.filter((i) => i.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline";
      setErrorByItem((m) => ({ ...m, [id]: msg }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative text-gray-500 hover:text-gray-800 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Inbox"
      >
        <span className="text-base">&#9993;</span>
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed left-2 right-2 top-12 mt-1 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wide">
              Invitations
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400">No invitations.</div>
            ) : (
              <ul className="max-h-96 overflow-y-auto">
                {items.map((inv) => (
                  <li
                    key={inv.id}
                    className="px-3 py-2.5 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {inv.institution_name ?? "Institution"}
                      {inv.department_name ? ` · ${inv.department_name}` : ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ROLE_LABELS[inv.role] ?? inv.role} · from{" "}
                      {inv.inviter_name ?? "someone"}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        disabled={busyId === inv.id}
                        onClick={() => accept(inv)}
                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        disabled={busyId === inv.id}
                        onClick={() => decline(inv.id)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                    {errorByItem[inv.id] && (
                      <div className="text-xs text-red-600 mt-1">
                        {errorByItem[inv.id]}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
