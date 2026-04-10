"use client";

import { useState, useEffect } from "react";
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

  async function load() {
    setLoading(true);
    try { setUsers(await api<User[]>("GET", "/api/users")); } catch {}
    try { setDepts(await api<Department[]>("GET", "/api/departments")); } catch {}
    try { setInsts(await api<Institution[]>("GET", "/api/institutions")); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const canManage = ROLE_LEVEL[user.role] >= ROLE_LEVEL["institution_head"];

  // Subtitle: institution name or "All Institutions"
  const subtitle = user.role === "admin"
    ? "All Institutions"
    : user.institution_id
      ? instMap.get(user.institution_id)?.name || ""
      : "";

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

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold">People</h2>
      {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}

      {message && (
        <div className="text-sm mb-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-600">
          {message}
        </div>
      )}

      <div className="space-y-1">
        {users.map((u) => {
          const isEditing = editingId === u.id;
          const editable = canManage && u.id !== user.id;

          return (
            <div key={u.id} className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
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
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{u.institution_id ? instMap.get(u.institution_id)?.name || "" : ""}</span>
                {isEditing ? (
                  <select
                    value={u.department_id || ""}
                    onChange={(e) => { if (e.target.value) assignDept(u.id, e.target.value); setEditingId(null); }}
                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                  >
                    <option value="">No dept</option>
                    {depts.map((d) => (
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
          );
        })}
      </div>
    </div>
  );
}
