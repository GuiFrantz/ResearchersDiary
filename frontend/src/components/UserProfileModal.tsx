"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  GENERIC_FAIL_MSG,
  ROLE_LABELS,
  type User,
  type Institution,
  type Department,
  type OrcidPreviewResult,
} from "@/lib/types";
import OrcidImportModal from "./OrcidImportModal";

interface Props {
  user: User;
  onClose: () => void;
  onSaved: () => void;
  onImported: () => void;
}

function normalizeOrcid(raw: string): string | null {
  const id = raw.trim().replace(/\/+$/, "").split("/").pop()!.toUpperCase();
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id) ? id : null;
}

const INVALID_ORCID_MSG = "Invalid ORCID iD format";

export default function UserProfileModal({ user, onClose, onSaved, onImported }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [orcidId, setOrcidId] = useState(user.orcid_id ?? "");
  const [instName, setInstName] = useState<string | null>(null);
  const [deptName, setDeptName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OrcidPreviewResult | null>(null);

  useEffect(() => {
    async function loadNames() {
      if (user.institution_id) {
        try {
          const inst = await api<Institution>("GET", `/api/institutions/${user.institution_id}`);
          setInstName(inst.name);
        } catch { /* leave blank */ }
      }
      if (user.department_id) {
        try {
          const dept = await api<Department>("GET", `/api/departments/${user.department_id}`);
          setDeptName(dept.name);
        } catch { /* leave blank */ }
      }
    }
    loadNames();
  }, [user.institution_id, user.department_id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const raw = orcidId.trim();
    const normalized = raw ? normalizeOrcid(raw) : null;
    if (raw && !normalized) {
      setError(INVALID_ORCID_MSG);
      return;
    }
    setSaving(true);
    try {
      await api("PUT", "/api/auth/me", {
        name: name.trim() || null,
        orcid_id: normalized,
      });
      if (normalized) setOrcidId(normalized);
      setSaved(true);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setError("");
    setSaved(false);
    const raw = orcidId.trim();
    if (!raw) {
      setError("Enter your ORCID iD");
      return;
    }
    const normalized = normalizeOrcid(raw);
    if (!normalized) {
      setError(INVALID_ORCID_MSG);
      return;
    }
    setImporting(true);
    try {
      const res = await api<OrcidPreviewResult>("POST", "/api/orcid/preview", {
        orcid_id: normalized,
      });
      setOrcidId(normalized);
      setPreview(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : GENERIC_FAIL_MSG);
    } finally {
      setImporting(false);
    }
  }

  function ReadonlyRow({ label, value }: { label: string; value: string }) {
    return (
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
        <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          {value}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {saved && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Saved.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            />
          </div>

          <ReadonlyRow label="Email" value={user.email} />
          <ReadonlyRow label="Role" value={ROLE_LABELS[user.role]} />
          <ReadonlyRow label="Institution" value={instName ?? "—"} />
          <ReadonlyRow label="Department" value={deptName ?? "—"} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ORCID iD</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={orcidId}
                onChange={(e) => setOrcidId(e.target.value)}
                placeholder="0000-0000-0000-0000"
                disabled={saving || importing}
                className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={saving || importing}
                className="shrink-0 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {importing ? "Searching..." : "Import"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Import publications, projects and experiences from ORCID.</p>
          </div>
        </form>

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {preview && (
        <OrcidImportModal
          orcidId={normalizeOrcid(orcidId)!}
          preview={preview}
          onClose={() => setPreview(null)}
          onImported={() => {
            onImported();
            onSaved();
          }}
        />
      )}
    </>
  );
}
