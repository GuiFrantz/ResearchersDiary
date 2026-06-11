"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import {
  ROLE_LABELS,
  ROLE_LEVEL,
  GENERIC_FAIL_MSG,
  type User,
  type Department,
  type Institution,
  type UserRole,
} from "@/lib/types";
import InviteForm from "./InviteForm";
import SentInvitations from "./SentInvitations";
import CreateInstitutionForm from "./CreateInstitutionForm";

const ROLE_COLORS: Record<string, string> = {
  researcher: "bg-gray-100 text-gray-700",
  department_head: "bg-blue-100 text-blue-700",
  institution_head: "bg-purple-100 text-purple-700",
};

// Stable color palette for institution badges
const INST_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",
  "bg-lime-100 text-lime-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-sky-100 text-sky-700",
];

const ALL_ROLES: UserRole[] = ["researcher", "department_head", "institution_head"];

interface Props { user: User; }

export default function PeopleSection({ user }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [insts, setInsts] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invitesRefresh, setInvitesRefresh] = useState(0);
  const canInvite =
    user.institution_id !== null &&
    (user.role === "institution_head" || user.role === "department_head");

  const deptMap = new Map(depts.map(d => [d.id, d]));
  const instMap = new Map(insts.map(i => [i.id, i]));

  // Build a stable color map for institutions
  const instColorMap = useMemo(() => {
    const map = new Map<string, string>();
    insts.forEach((inst, idx) => {
      map.set(inst.id, INST_COLORS[idx % INST_COLORS.length]);
    });
    return map;
  }, [insts]);

  async function load() {
    setLoading(true);
    try { setUsers(await api<User[]>("GET", "/api/users")); } catch {}
    try { setDepts(await api<Department[]>("GET", "/api/departments")); } catch {}
    try { setInsts(await api<Institution[]>("GET", "/api/institutions")); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const canManage = ROLE_LEVEL[user.role] >= ROLE_LEVEL["institution_head"];

  // Sort users: group by institution (unaffiliated last), then alphabetical within group
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aInst = a.institution_id || "";
      const bInst = b.institution_id || "";
      // Unaffiliated users go to the end
      if (!aInst && bInst) return 1;
      if (aInst && !bInst) return -1;
      // Sort by institution name
      const aName = (aInst && instMap.get(aInst)?.name) || "";
      const bName = (bInst && instMap.get(bInst)?.name) || "";
      if (aName !== bName) return aName.localeCompare(bName);
      // Within same institution, sort by user name
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [users, instMap]);

  // Group headers: detect when institution changes
  function getInstHeader(u: User, idx: number): string | null {
    const prevUser = idx > 0 ? sortedUsers[idx - 1] : null;
    const curInstId = u.institution_id || null;
    const prevInstId = prevUser?.institution_id || null;
    if (curInstId === prevInstId) return null;
    if (!curInstId) return "Unaffiliated";
    return instMap.get(curInstId)?.name || "Unknown Institution";
  }

  async function changeRole(target: User, role: UserRole) {
    if (role === target.role) return;
    const note = roleChangeNote(target, role);
    if (!window.confirm(note)) return;
    setMessage("");
    try {
      await api("PUT", `/api/users/${target.id}/role`, { role });
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    }
  }

  async function assignDept(userId: string, deptId: string) {
    setMessage("");
    try {
      await api("PUT", `/api/users/${userId}/department`, { department_id: deptId });
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    }
  }

  function roleChangeNote(target: User, newRole: UserRole): string {
    const name = target.name || target.email;
    const oldLabel = ROLE_LABELS[target.role] ?? target.role;
    const newLabel = ROLE_LABELS[newRole] ?? newRole;
    const lines = [
      `Change ${name}'s role from ${oldLabel} to ${newLabel}?`,
      "",
    ];
    if (ROLE_LEVEL[newRole] > ROLE_LEVEL[target.role]) {
      lines.push("This is a promotion — they'll gain new permissions immediately.");
    } else if (ROLE_LEVEL[newRole] < ROLE_LEVEL[target.role]) {
      lines.push("This is a demotion — they'll lose their current permissions.");
      if (target.role === "institution_head") {
        lines.push(
          "If they're the only institution head with members remaining, the change will be blocked.",
        );
      }
      if (target.role === "department_head") {
        lines.push(
          "If they're the only department head with members remaining, the change will be blocked.",
        );
      }
    }
    return lines.join("\n");
  }

  async function removeUser(target: User) {
    const name = target.name || target.email;
    const lines = [
      `Remove ${name} from this institution?`,
      "",
      "They will be cleared from this institution and any department.",
      "Their personal records stay with them.",
    ];
    if (!window.confirm(lines.join("\n"))) return;
    setMessage("");
    try {
      await api("DELETE", `/api/users/${target.id}/institution`);
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    }
  }

  async function leaveInstitution() {
    if (!user.institution_id) return;
    const lines = [
      "Leave this institution?",
      "",
      "You'll become unaffiliated and your role will reset to Researcher.",
      "Your personal records stay with you.",
      "If you're the last member, the institution and its departments will be deleted.",
      "If you're the institution head, transfer the role before leaving.",
    ];
    if (!window.confirm(lines.join("\n"))) return;
    setMessage("");
    try {
      await api("POST", `/api/institutions/${user.institution_id}/leave`);
      window.location.reload();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    }
  }

  function canRemove(target: User): boolean {
    if (target.id === user.id) return false;
    if (target.institution_id !== user.institution_id) return false;
    if (user.role === "institution_head") {
      return ROLE_LEVEL[target.role] < ROLE_LEVEL[user.role];
    }
    if (user.role === "department_head") {
      return (
        target.department_id === user.department_id &&
        ROLE_LEVEL[target.role] < ROLE_LEVEL[user.role]
      );
    }
    return false;
  }

  function allowedRolesFor(target: User): UserRole[] {
    if (target.id === user.id) return [];
    const max = ROLE_LEVEL[user.role];
    return ALL_ROLES.filter((r) => ROLE_LEVEL[r] < max);
  }

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>;

  if (user.institution_id === null) {
    return (
      <div>
        <h2 className="text-lg font-semibold">People</h2>
        <p className="text-sm text-gray-500 mt-4 mb-3">
          You&apos;re not in an institution yet. Create one or wait for an invitation.
        </p>
        <CreateInstitutionForm onCreated={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">People</h2>
        <button
          onClick={leaveInstitution}
          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Leave institution
        </button>
      </div>

      {message && (
        <div className="text-sm mb-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-600">
          {message}
        </div>
      )}

      {canInvite && (
        <div className="space-y-2 mt-4">
          <InviteForm
            user={user}
            onCreated={() => {
              setInvitesRefresh((n) => n + 1);
              load();
            }}
          />
          <SentInvitations refreshKey={invitesRefresh} />
        </div>
      )}

      <div className="space-y-1 mt-4">
        {sortedUsers.map((u, idx) => {
          const isEditing = editingId === u.id;
          const editable = canManage && u.id !== user.id;
          const header = getInstHeader(u, idx);
          const instColor = u.institution_id ? instColorMap.get(u.institution_id) : null;

          return (
            <div key={u.id}>
              {header !== null && (
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4 pb-1 px-1">
                  {header}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{u.name || "—"}</span>
                  {isEditing ? (
                    <select
                      value={u.role}
                      onChange={(e) => { changeRole(u, e.target.value as UserRole); setEditingId(null); }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                    >
                      <option value={u.role}>{ROLE_LABELS[u.role] ?? u.role}</option>
                      {allowedRolesFor(u)
                        .filter((r) => r !== u.role)
                        .map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                    </select>
                  ) : (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  )}
                  {/* Institution badge */}
                  {!isEditing && u.institution_id && instColor && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${instColor}`}>
                      {instMap.get(u.institution_id)?.name || ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {isEditing ? (
                    <select
                      value={u.department_id || ""}
                      onChange={(e) => { if (e.target.value) assignDept(u.id, e.target.value); }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                    >
                      <option value="">No dept</option>
                      {depts.filter((d) => d.institution_id === u.institution_id).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{u.department_id ? deptMap.get(u.department_id)?.name || "" : ""}</span>
                  )}
                  {editable && !isEditing && (
                    <button
                      onClick={() => setEditingId(u.id)}
                      className="text-xs text-gray-300 hover:text-gray-500 ml-1"
                    >
                      Edit
                    </button>
                  )}
                  {!isEditing && canRemove(u) && (
                    <button
                      onClick={() => removeUser(u)}
                      className="text-xs text-red-400 hover:text-red-600 ml-1"
                    >
                      Remove
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-300 hover:text-gray-500 ml-1"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
