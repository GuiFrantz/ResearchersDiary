"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import type { User, Department, Institution, UserRole } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  researcher: "Researcher",
  department_head: "Dept Head",
  institution_head: "Inst Head",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  researcher: "bg-gray-100 text-gray-700",
  department_head: "bg-blue-100 text-blue-700",
  institution_head: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

const ROLE_LEVEL: Record<string, number> = {
  researcher: 0, department_head: 1, institution_head: 2, admin: 3,
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

const ALL_ROLES: UserRole[] = ["researcher", "department_head", "institution_head", "admin"];

interface Props { user: User; }

export default function PeopleSection({ user }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [insts, setInsts] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function changeRole(userId: string, role: UserRole) {
    setMessage("");
    try {
      await api("PUT", `/api/users/${userId}/role`, { role });
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function assignDept(userId: string, deptId: string) {
    setMessage("");
    try {
      await api("PUT", `/api/users/${userId}/department`, { department_id: deptId });
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function assignInst(userId: string, instId: string) {
    setMessage("");
    try {
      await api("PUT", `/api/users/${userId}/institution`, { institution_id: instId });
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold">People</h2>

      {message && (
        <div className="text-sm mb-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-600">
          {message}
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
              <div className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{u.name || "—"}</span>
                  {isEditing ? (
                    <select
                      value={u.role}
                      onChange={(e) => { changeRole(u.id, e.target.value as UserRole); setEditingId(null); }}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                    >
                      {ALL_ROLES.map((r) => (
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
                    <>
                      {/* Institution assignment — admin only */}
                      {user.role === "admin" && (
                        <select
                          value={u.institution_id || ""}
                          onChange={(e) => { if (e.target.value) assignInst(u.id, e.target.value); }}
                          className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                        >
                          <option value="">No institution</option>
                          {insts.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      )}
                      {/* Department assignment */}
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
                    </>
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
