"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { AnyRecord } from "@/lib/types";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "textarea" | "checkbox";
  opts?: string[];
  required?: boolean;
}

interface Props {
  entity: string;
  endpoint: string;
  fields: FieldDef[];
  record: AnyRecord | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
  viewOnly?: boolean;
}

export default function RecordForm({ entity, endpoint, fields, record, onClose, onSaved, viewOnly }: Props) {
  const isEdit = record !== null;
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    if (!record) {
      const defaults: Record<string, string | boolean> = {};
      for (const f of fields) {
        if (f.type === "checkbox") defaults[f.name] = false;
        else if (f.name === "visibility") defaults[f.name] = "institution";
        else defaults[f.name] = "";
      }
      return defaults;
    }
    const v: Record<string, string | boolean> = {};
    for (const f of fields) {
      const val = (record as unknown as Record<string, unknown>)[f.name];
      if (f.type === "checkbox") v[f.name] = Boolean(val);
      else v[f.name] = val != null ? String(val) : "";
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
        if (f.type === "checkbox") {
          body[f.name] = v;
        } else if (f.type === "number") {
          body[f.name] = v ? Number(v) : null;
        } else {
          body[f.name] = v || null;
        }
      }

      if (isEdit) {
        await api("PUT", `${endpoint}/${record.id}`, body);
      } else {
        await api("POST", endpoint, body);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record || !confirm(`Delete this ${entity}?`)) return;
    setSaving(true);
    try {
      await api("DELETE", `${endpoint}/${record.id}`);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {viewOnly ? entity : isEdit ? `Edit ${entity}` : `New ${entity}`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {fields.map((f) => (
            <div key={f.name}>
              {f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={(e) => set(f.name, e.target.checked)}
                    disabled={viewOnly}
                    className="rounded border-gray-300"
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label}{f.required && <span className="text-red-400"> *</span>}
                  </label>
                  {f.type === "select" ? (
                    <select
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      required={f.required}
                      disabled={viewOnly}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="">—</option>
                      {f.opts?.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      rows={3}
                      disabled={viewOnly}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={String(values[f.name])}
                      onChange={(e) => set(f.name, e.target.value)}
                      required={f.required}
                      disabled={viewOnly}
                      step={f.type === "number" ? "any" : undefined}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </form>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
          {isEdit && !viewOnly && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {viewOnly ? "Close" : "Cancel"}
          </button>
          {!viewOnly && (
            <button
              type="submit"
              form=""
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector<HTMLFormElement>(".fixed form");
                form?.requestSubmit();
              }}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
