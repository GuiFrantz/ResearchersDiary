"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import type { Department } from "@/lib/types";
import { Button, Input, SectionHeading } from "./ui";

interface Props {
  depts: Department[];
  institutionId: string;
  notify: (text: string, tone: "success" | "error") => void;
  onChanged: () => void;
}

export default function DepartmentList({ depts, institutionId, notify, onChanged }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  async function create() {
    if (!name.trim()) return;
    try {
      await api("POST", "/api/departments", {
        institution_id: institutionId,
        name: name.trim(),
        code: code.trim() || null,
      });
      setName("");
      setCode("");
      setShowCreate(false);
      notify(TEXT.management.deptCreated, "success");
      onChanged();
    } catch (err: unknown) {
      notify(errMsg(err), "error");
    }
  }

  async function save() {
    if (!editingId || !editName.trim()) return;
    try {
      await api("PUT", `/api/departments/${editingId}`, {
        name: editName.trim(),
        code: editCode.trim() || null,
      });
      setEditingId(null);
      notify(TEXT.management.deptUpdated, "success");
      onChanged();
    } catch (err: unknown) {
      notify(errMsg(err), "error");
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4 mb-1.5">
        <SectionHeading>{TEXT.management.departments(depts.length)}</SectionHeading>
        {!showCreate && (
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
            {TEXT.management.createDept}
          </Button>
        )}
      </div>
      {depts.map((dept) =>
        editingId === dept.id ? (
          <div key={dept.id} className="flex items-center gap-2 px-3 py-3 border-b border-dust-200">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
            <Input
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              placeholder={TEXT.management.codePlaceholder}
              className="w-20"
            />
            <Button size="sm" onClick={save}>{TEXT.common.save}</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>{TEXT.common.cancel}</Button>
          </div>
        ) : (
          <div key={dept.id} className="flex items-center gap-3 px-3 py-3 border-b border-dust-200">
            <span className="text-sm font-medium">{dept.name}</span>
            {dept.code && <span className="font-mono text-xs text-dust-600">{dept.code}</span>}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEditingId(dept.id); setEditName(dept.name); setEditCode(dept.code ?? ""); }}
            >
              {TEXT.common.edit}
            </Button>
          </div>
        ),
      )}
      {showCreate && (
        <div className="flex gap-2 max-w-md mt-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={TEXT.management.newDeptPlaceholder}
            autoFocus
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={TEXT.management.codePlaceholder}
            className="w-20"
          />
          <Button onClick={create}>{TEXT.common.create}</Button>
          <Button variant="ghost" onClick={() => { setShowCreate(false); setName(""); setCode(""); }}>
            {TEXT.common.cancel}
          </Button>
        </div>
      )}
    </section>
  );
}
