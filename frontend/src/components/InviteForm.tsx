"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  NOT_AFFILIATED_MSG,
  GENERIC_FAIL_MSG,
  type Department,
  type User,
  type UserRole,
} from "@/lib/types";

interface Props {
  user: User;
  onCreated: () => void;
}

export default function InviteForm({ user, onCreated }: Props) {
  const [depts, setDepts] = useState<Department[]>([]);
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

  useEffect(() => {
    (async () => {
      try {
        setDepts(await api<Department[]>("GET", "/api/departments"));
      } catch {
        setDepts([]);
      }
    })();
  }, []);

  const allowedRoles: UserRole[] = ["researcher", "department_head"];

  const instDepts = useMemo(
    () => depts.filter((d) => d.institution_id === user.institution_id),
    [depts, user.institution_id],
  );

  const deptRequired = isInstHead && role === "department_head";

  function recipientIneligibleReason(u: User): string | null {
    if (u.id === user.id) return "You can't invite yourself.";
    if (isDeptHead) {
      if (u.institution_id !== user.institution_id) {
        return "This user is not in your institution.";
      }
      if (u.role === "institution_head") {
        return "You can't invite the institution head.";
      }
      if (u.department_id === user.department_id) {
        return "This user is already in your department.";
      }
    } else if (isInstHead) {
      if (u.institution_id === user.institution_id) {
        return "This user is already in your institution.";
      }
    }
    return null;
  }

  function crossInstitutionNotice(): string | null {
    if (!recipient) return null;
    if (!isInstHead) return null;
    if (recipient.institution_id === null) return null;
    return "This user is currently in another institution. If they accept, they'll leave it. A user can only belong to one institution at a time.";
  }

  async function lookup() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setLookupError("");
    setRecipient(null);
    setLookingUp(true);
    try {
      const found = await api<User>(
        "GET",
        `/api/users/find-user?email=${encodeURIComponent(email)}`,
      );
      const ineligible = recipientIneligibleReason(found);
      if (ineligible) {
        setLookupError(ineligible);
      } else {
        setRecipient(found);
      }
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    } finally {
      setLookingUp(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!recipient) {
      setError("Look up a recipient first.");
      return;
    }
    if (!user.institution_id) {
      setError(NOT_AFFILIATED_MSG);
      return;
    }
    if (deptRequired && !departmentId) {
      setError("Pick a department for the department-head invitation.");
      return;
    }

    const notice = crossInstitutionNotice();
    if (notice && !window.confirm(`${notice}\n\nSend invitation anyway?`)) return;

    const payload: Record<string, string | null> = {
      recipient_id: recipient.id,
      institution_id: user.institution_id,
      role,
    };

    if (isDeptHead) {
      payload.department_id = user.department_id;
    } else if (isInstHead && departmentId) {
      payload.department_id = departmentId;
    }

    setSubmitting(true);
    try {
      await api("POST", "/api/invitations/", payload);
      setEmailInput("");
      setRecipient(null);
      setDepartmentId("");
      setRole("researcher");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
    >
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Send invitation
      </div>
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}

      {!recipient ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup();
              }
            }}
            placeholder="Recipient email..."
            className="flex-1 min-w-[14rem] text-xs border border-gray-200 rounded px-2 py-1"
          />
          <button
            type="button"
            onClick={lookup}
            disabled={lookingUp || !emailInput.trim()}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {lookingUp ? "Looking..." : "Find"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-700">
            <span className="font-medium">{recipient.name || recipient.email}</span>{" "}
            <span className="text-gray-400">({recipient.email})</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setRecipient(null);
              setEmailInput("");
            }}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            change
          </button>
        </div>
      )}

      {lookupError && (
        <div className="text-xs text-red-600">{lookupError}</div>
      )}

      {crossInstitutionNotice() && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          ⚠ {crossInstitutionNotice()}
        </div>
      )}

      {recipient && (
        <div className="flex flex-wrap gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="text-xs border border-gray-200 rounded px-1.5 py-1"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {isInstHead && (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="text-xs border border-gray-200 rounded px-1.5 py-1"
            >
              <option value="">
                {deptRequired ? "Department (required)..." : "No department"}
              </option>
              {instDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      )}
    </form>
  );
}
