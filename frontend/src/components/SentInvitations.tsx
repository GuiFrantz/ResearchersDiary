"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, type Invitation } from "@/lib/types";

interface Props {
  refreshKey: number;
}

export default function SentInvitations({ refreshKey }: Props) {
  const [items, setItems] = useState<Invitation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Invitation[]>("GET", "/api/invitations/sent"));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await api("DELETE", `/api/invitations/${id}`);
      setItems((cur) => cur.filter((i) => i.id !== id));
    } catch {
      // leave it
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Pending invitations sent
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">No pending invitations.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded"
            >
              <div className="text-gray-700 min-w-0">
                <span className="font-medium">{inv.recipient_name ?? "(user)"}</span>{" "}
                · {ROLE_LABELS[inv.role] ?? inv.role}
                {inv.department_name ? ` · ${inv.department_name}` : ""}
                <span className="text-gray-400">
                  {" "}
                  · sent {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                disabled={busyId === inv.id}
                onClick={() => cancel(inv.id)}
                className="shrink-0 text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
