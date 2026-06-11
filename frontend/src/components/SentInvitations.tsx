"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Invitation } from "@/lib/types";
import { Button } from "./ui";

interface Props {
  refreshKey: number;
}

export default function SentInvitations({ refreshKey }: Props) {
  const { data, reload } = useLoad(
    () => api<Invitation[]>("GET", "/api/invitations/sent").catch(() => [] as Invitation[]),
    [refreshKey],
  );
  const items = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await api("DELETE", `/api/invitations/${id}`);
      reload();
    } catch { /* leave it */ } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <div className="text-xs text-dust-500">{TEXT.sent.empty}</div>;
  }

  return (
    <ul className="space-y-1">
      {items.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between gap-2 text-xs px-2.5 py-2 bg-dust-100 rounded-lg">
          <div className="text-dust-700 min-w-0">
            <span className="font-medium">{inv.recipient_name ?? TEXT.sent.unknownUser}</span>{" "}
            · {ROLE_LABELS[inv.role]}
            {inv.department_name ? ` · ${inv.department_name}` : ""}
            <span className="text-dust-500"> · {TEXT.sent.sentOn(inv.created_at)}</span>
          </div>
          <Button variant="danger" size="sm" className="shrink-0" disabled={busyId === inv.id} onClick={() => cancel(inv.id)}>
            {TEXT.common.cancel}
          </Button>
        </li>
      ))}
    </ul>
  );
}
