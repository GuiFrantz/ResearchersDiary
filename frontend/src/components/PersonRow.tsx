"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { ALL_ROLES, ROLE_LABELS, ROLE_LEVEL, ROLE_TONES, TEXT } from "@/lib/constants";
import type { Department, User, UserRole } from "@/lib/types";
import { Button, Pill, Select } from "./ui";

function canRemove(me: User, target: User): boolean {
  if (target.id === me.id) return false;
  if (target.institution_id !== me.institution_id) return false;
  if (me.role === "institution_head") return ROLE_LEVEL[target.role] < ROLE_LEVEL[me.role];
  if (me.role === "department_head") {
    return target.department_id === me.department_id && ROLE_LEVEL[target.role] < ROLE_LEVEL[me.role];
  }
  return false;
}

function allowedRolesFor(me: User, target: User): UserRole[] {
  if (target.id === me.id) return [];
  return ALL_ROLES.filter((r) => ROLE_LEVEL[r] < ROLE_LEVEL[me.role]);
}

interface Props {
  target: User;
  me: User;
  depts: Department[];
  deptMap: Map<string, Department>;
  onChanged: () => void;
}

export default function PersonRow({ target, me, depts, deptMap, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const editable = ROLE_LEVEL[me.role] >= ROLE_LEVEL.institution_head && target.id !== me.id;

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      onChanged();
    } catch (err: unknown) {
      setError(errMsg(err));
    }
  }

  function changeRole(role: UserRole) {
    if (role === target.role) return;
    if (!window.confirm(TEXT.people.confirmRoleChange(target, role))) return;
    run(() => api("PUT", `/api/users/${target.id}/role`, { role }));
  }

  function remove() {
    if (!window.confirm(TEXT.people.confirmRemove(target.name || target.email))) return;
    run(() => api("DELETE", `/api/users/${target.id}/institution`));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3.5 border-b border-dust-200">
      <span className="text-sm font-medium">{target.name || "—"}</span>
      {target.id === me.id && <span className="text-xs text-dust-500">{TEXT.people.you}</span>}
      {editing ? (
        <Select
          value={target.role}
          onChange={(e) => { changeRole(e.target.value as UserRole); setEditing(false); }}
        >
          <option value={target.role}>{ROLE_LABELS[target.role]}</option>
          {allowedRolesFor(me, target)
            .filter((r) => r !== target.role)
            .map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
      ) : (
        <Pill tone={ROLE_TONES[target.role]}>{ROLE_LABELS[target.role]}</Pill>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-xs text-dust-600">
        {editing ? (
          <Select
            value={target.department_id || ""}
            onChange={(e) => { if (e.target.value) run(() => api("PUT", `/api/users/${target.id}/department`, { department_id: e.target.value })); }}
          >
            <option value="">{TEXT.people.noDept}</option>
            {depts
              .filter((d) => d.institution_id === target.institution_id)
              .map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        ) : (
          <span>{target.department_id ? deptMap.get(target.department_id)?.name || "" : ""}</span>
        )}
        {editable && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>{TEXT.common.edit}</Button>
        )}
        {!editing && canRemove(me, target) && (
          <Button variant="danger" size="sm" onClick={remove}>{TEXT.people.remove}</Button>
        )}
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{TEXT.common.done}</Button>
        )}
      </div>
      {error && <div className="w-full text-xs text-clay">{error}</div>}
    </div>
  );
}
