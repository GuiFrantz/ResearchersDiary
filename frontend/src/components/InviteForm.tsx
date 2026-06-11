"use client";

import { useMemo, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { ROLE_LABELS, TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Department, User, UserRole } from "@/lib/types";
import { Banner, Button, Input, Select } from "./ui";

const INVITABLE_ROLES: UserRole[] = ["researcher", "department_head"];

interface Props {
  user: User;
  onCreated: () => void;
}

export default function InviteForm({ user, onCreated }: Props) {
  const { data: depts } = useLoad(() => api<Department[]>("GET", "/api/departments").catch(() => [] as Department[]));
  const [emailInput, setEmailInput] = useState("");
  const [recipient, setRecipient] = useState<User | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [role, setRole] = useState<UserRole>("researcher");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isInstHead = user.role === "institution_head";
  const isDeptHead = user.role === "department_head";

  const instDepts = useMemo(
    () => (depts ?? []).filter((d) => d.institution_id === user.institution_id),
    [depts, user.institution_id],
  );

  const deptRequired = isInstHead && role === "department_head";

  function ineligibleReason(u: User): string | null {
    if (u.id === user.id) return TEXT.invite.selfInvite;
    if (isDeptHead) {
      if (u.institution_id !== user.institution_id) return TEXT.invite.notInYourInstitution;
      if (u.role === "institution_head") return TEXT.invite.isInstHead;
      if (u.department_id === user.department_id) return TEXT.invite.alreadyInDept;
    } else if (isInstHead) {
      if (u.institution_id === user.institution_id) return TEXT.invite.alreadyInInstitution;
    }
    return null;
  }

  const crossInstitutionNotice =
    recipient && isInstHead && recipient.institution_id !== null ? TEXT.invite.crossInstitution : null;

  async function lookup() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setLookupError("");
    setRecipient(null);
    setLookingUp(true);
    try {
      const found = await api<User>("GET", `/api/users/find-user?email=${encodeURIComponent(email)}`);
      const ineligible = ineligibleReason(found);
      if (ineligible) setLookupError(ineligible);
      else setRecipient(found);
    } catch (err: unknown) {
      setLookupError(errMsg(err));
    } finally {
      setLookingUp(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!recipient) {
      setError(TEXT.invite.lookupFirst);
      return;
    }
    if (!user.institution_id) {
      setError(TEXT.common.notAffiliated);
      return;
    }
    if (deptRequired && !departmentId) {
      setError(TEXT.invite.pickDept);
      return;
    }
    if (crossInstitutionNotice && !window.confirm(TEXT.invite.confirmSendAnyway(crossInstitutionNotice))) return;

    const payload: Record<string, string | null> = {
      recipient_id: recipient.id,
      institution_id: user.institution_id,
      role,
    };
    if (isDeptHead) payload.department_id = user.department_id;
    else if (isInstHead && departmentId) payload.department_id = departmentId;

    setSubmitting(true);
    try {
      await api("POST", "/api/invitations", payload);
      setEmailInput("");
      setRecipient(null);
      setDepartmentId("");
      setRole("researcher");
      onCreated();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && <Banner tone="error">{error}</Banner>}

      {!recipient ? (
        <div className="flex flex-wrap gap-2">
          <Input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup();
              }
            }}
            placeholder={TEXT.invite.emailPlaceholder}
            className="flex-1 min-w-56"
          />
          <Button type="button" onClick={lookup} disabled={lookingUp || !emailInput.trim()}>
            {lookingUp ? TEXT.invite.finding : TEXT.invite.find}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-dust-700">
            <span className="font-medium">{recipient.name || recipient.email}</span>{" "}
            <span className="text-dust-500">({recipient.email})</span>
          </span>
          <button
            type="button"
            onClick={() => { setRecipient(null); setEmailInput(""); }}
            className="text-xs text-dust-500 hover:text-dust-700 underline"
          >
            {TEXT.invite.change}
          </button>
        </div>
      )}

      {lookupError && <div className="text-xs text-clay">{lookupError}</div>}

      {crossInstitutionNotice && <Banner tone="notice">{crossInstitutionNotice}</Banner>}

      {recipient && (
        <div className="flex flex-wrap gap-2">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
          {isInstHead && (
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{deptRequired ? TEXT.invite.deptRequired : TEXT.invite.noDept}</option>
              {instDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? TEXT.invite.sending : TEXT.invite.send}
          </Button>
        </div>
      )}
    </form>
  );
}
