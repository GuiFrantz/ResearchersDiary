"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import type { FieldDef } from "@/lib/entities";
import type { AnyRecord } from "@/lib/types";
import Drawer from "./Drawer";
import { Banner, Button, Field, Input, Select, Textarea } from "./ui";

interface Props {
  entity: string;
  endpoint: string;
  fields: FieldDef[];
  record: AnyRecord | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
  viewOnly?: boolean;
}

export default function RecordForm({ entity, endpoint, fields, record, onClose, onSaved, viewOnly = false }: Props) {
  const isEdit = record !== null;
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {};
    for (const f of fields) {
      if (!record) {
        if (f.type === "checkbox") v[f.name] = false;
        else if (f.name === "visibility") v[f.name] = "institution";
        else v[f.name] = "";
      } else {
        const val = (record as unknown as Record<string, unknown>)[f.name];
        if (f.type === "checkbox") v[f.name] = Boolean(val);
        else v[f.name] = val != null ? String(val) : "";
      }
    }
    return v;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(name: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.type === "checkbox") body[f.name] = v;
        else if (f.type === "number") body[f.name] = v ? Number(v) : null;
        else body[f.name] = v || null;
      }
      if (isEdit) await api("PUT", `${endpoint}/${record.id}`, body);
      else await api("POST", endpoint, body);
      onSaved();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record || !confirm(TEXT.records.confirmDelete(entity))) return;
    setSaving(true);
    try {
      await api("DELETE", `${endpoint}/${record.id}`);
      onSaved();
    } catch (err: unknown) {
      setError(errMsg(err));
      setSaving(false);
    }
  }

  const title = viewOnly ? entity : isEdit ? TEXT.records.editTitle(entity) : TEXT.records.newTitle(entity);

  const footer = (
    <>
      {isEdit && !viewOnly && (
        <Button variant="danger" onClick={handleDelete} disabled={saving}>{TEXT.common.delete}</Button>
      )}
      <div className="flex-1" />
      <Button variant="ghost" onClick={onClose}>{viewOnly ? TEXT.common.close : TEXT.common.cancel}</Button>
      {!viewOnly && (
        <Button type="submit" form="record-form" disabled={saving}>
          {saving ? TEXT.common.saving : isEdit ? TEXT.common.save : TEXT.common.create}
        </Button>
      )}
    </>
  );

  return (
    <Drawer title={title} onClose={onClose} footer={footer} formId="record-form" onSubmit={handleSubmit}>
      {error && <Banner tone="error" className="mb-4">{error}</Banner>}
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.name} className="flex items-center gap-2 text-sm cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={Boolean(values[f.name])}
              onChange={(e) => set(f.name, e.target.checked)}
              disabled={viewOnly}
              className="size-4 accent-hunter"
            />
            {f.label}
          </label>
        ) : (
          <Field key={f.name} label={<>{f.label}{f.required && <span className="text-clay"> *</span>}</>}>
            {f.type === "select" ? (
              <Select
                value={String(values[f.name])}
                onChange={(e) => set(f.name, e.target.value)}
                required={f.required}
                disabled={viewOnly}
                className="w-full"
              >
                <option value="">—</option>
                {f.opts?.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : f.type === "textarea" ? (
              <Textarea
                value={String(values[f.name])}
                onChange={(e) => set(f.name, e.target.value)}
                rows={3}
                disabled={viewOnly}
                className="w-full"
              />
            ) : (
              <Input
                type={f.type}
                value={String(values[f.name])}
                onChange={(e) => set(f.name, e.target.value)}
                required={f.required}
                disabled={viewOnly}
                step={f.type === "number" ? "any" : undefined}
                className="w-full"
              />
            )}
          </Field>
        ),
      )}
    </Drawer>
  );
}
