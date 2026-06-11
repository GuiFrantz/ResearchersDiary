"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Invitation } from "@/lib/types";
import { Button, SectionHeading } from "./ui";

interface Props {
  onChanged: () => void;
}

export default function Inbox({ onChanged }: Props) {
  const { data, reload } = useLoad(() =>
    api<Invitation[]>("GET", "/api/invitations/received").catch(() => [] as Invitation[]),
  );
  const items = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(inv: Invitation, action: "accept" | "decline") {
    if (action === "accept" && !window.confirm(TEXT.inbox.confirmAccept(inv))) return;
    setBusyId(inv.id);
    setError("");
    try {
      await api("POST", `/api/invitations/${inv.id}/${action}`);
      reload();
      onChanged();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeading className="mb-2">{TEXT.inbox.title}</SectionHeading>
      {error && <div className="text-xs text-clay mb-2">{error}</div>}
      {items.length === 0 ? (
        <div className="text-xs text-dust-500">{TEXT.inbox.empty}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((inv) => (
            <li key={inv.id} className="bg-dust-50 border border-dust-200 rounded-lg px-3 py-2.5">
              <div className="text-sm font-medium">{TEXT.inbox.institutionLine(inv)}</div>
              <div className="text-xs text-dust-600">{TEXT.inbox.fromLine(inv)}</div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" disabled={busyId === inv.id} onClick={() => act(inv, "accept")}>
                  {TEXT.inbox.accept}
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === inv.id} onClick={() => act(inv, "decline")}>
                  {TEXT.inbox.decline}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
