"use client";

import { useMemo, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { ROLE_LEVEL, TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Department, Institution, User } from "@/lib/types";
import CreateInstitutionForm from "./CreateInstitutionForm";
import InviteForm from "./InviteForm";
import PersonRow from "./PersonRow";
import SentInvitations from "./SentInvitations";
import { Banner, Button, Loading, PageTitle, SectionHeading } from "./ui";

interface Props {
  user: User;
}

export default function PeopleSection({ user }: Props) {
  const { data, loading, reload } = useLoad(() =>
    Promise.all([
      api<User[]>("GET", "/api/users").catch(() => []),
      api<Department[]>("GET", "/api/departments").catch(() => []),
      api<Institution[]>("GET", "/api/institutions").catch(() => []),
    ]),
  );
  const [users, depts, insts] = data ?? [[], [], []];

  const [message, setMessage] = useState("");
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const [showInvite, setShowInvite] = useState(false);

  const canInvite = user.institution_id !== null && ROLE_LEVEL[user.role] >= ROLE_LEVEL.department_head;

  const deptMap = useMemo(() => new Map(depts.map((d) => [d.id, d])), [depts]);
  const instMap = useMemo(() => new Map(insts.map((i) => [i.id, i])), [insts]);

  // Group by institution (unaffiliated last), alphabetical within group
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aInst = a.institution_id || "";
      const bInst = b.institution_id || "";
      if (!aInst && bInst) return 1;
      if (aInst && !bInst) return -1;
      const aName = (aInst && instMap.get(aInst)?.name) || "";
      const bName = (bInst && instMap.get(bInst)?.name) || "";
      if (aName !== bName) return aName.localeCompare(bName);
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [users, instMap]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      const key = u.institution_id || "none";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [users]);

  // Header text when the institution changes between consecutive rows
  function instHeader(u: User, idx: number): string | null {
    const prevInstId = idx > 0 ? sortedUsers[idx - 1].institution_id || null : null;
    const curInstId = u.institution_id || null;
    if (idx > 0 && curInstId === prevInstId) return null;
    const count = groupCounts.get(curInstId || "none") || 0;
    const name = !curInstId
      ? TEXT.people.unaffiliated
      : instMap.get(curInstId)?.name || TEXT.people.unknownInstitution;
    return `${name} · ${count}`;
  }

  async function leaveInstitution() {
    if (!user.institution_id || !window.confirm(TEXT.people.confirmLeave)) return;
    setMessage("");
    try {
      await api("POST", `/api/institutions/${user.institution_id}/leave`);
      window.location.reload();
    } catch (err: unknown) {
      setMessage(errMsg(err));
    }
  }

  if (loading) return <Loading />;

  if (user.institution_id === null) {
    return (
      <div>
        <PageTitle>{TEXT.people.title}</PageTitle>
        <p className="text-sm text-dust-600 mt-4 mb-3">{TEXT.people.noInstitution}</p>
        <CreateInstitutionForm onCreated={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div>
      <PageTitle>{TEXT.people.title}</PageTitle>

      {message && <Banner tone="error" className="mt-4">{message}</Banner>}

      {canInvite && (
        <div className="mt-7">
          <div className="flex items-end justify-between gap-4 mb-2">
            <SectionHeading>{TEXT.people.pendingSent}</SectionHeading>
            {!showInvite && (
              <Button variant="ghost" size="sm" onClick={() => setShowInvite(true)}>
                {TEXT.people.sendInvitation}
              </Button>
            )}
          </div>
          {showInvite && (
            <div className="mb-4">
              <InviteForm
                user={user}
                onCreated={() => {
                  setShowInvite(false);
                  setInvitesRefresh((n) => n + 1);
                  reload();
                }}
              />
            </div>
          )}
          <SentInvitations refreshKey={invitesRefresh} />
        </div>
      )}

      <div className="mt-7">
        {sortedUsers.map((u, idx) => {
          const header = instHeader(u, idx);
          return (
            <div key={u.id}>
              {header !== null && <SectionHeading className="mt-9 mb-1.5">{header}</SectionHeading>}
              <PersonRow target={u} me={user} depts={depts} deptMap={deptMap} onChanged={reload} />
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-6">
        <Button variant="danger" size="sm" onClick={leaveInstitution}>{TEXT.people.leave}</Button>
      </div>
    </div>
  );
}
