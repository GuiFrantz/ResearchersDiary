"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { ROLE_LABELS, TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Department, Institution, OrcidPreviewResult, User } from "@/lib/types";
import Drawer from "./Drawer";
import Inbox from "./Inbox";
import OrcidImportModal from "./OrcidImportModal";
import { Banner, Button, Field, Input } from "./ui";

interface Props {
  user: User;
  onClose: () => void;
  onSaved: () => void;
  onImported: () => void;
  onLogout: () => void;
  onInvitesChanged: () => void;
}

function normalizeOrcid(raw: string): string | null {
  const id = raw.trim().replace(/\/+$/, "").split("/").pop()!.toUpperCase();
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id) ? id : null;
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className="text-sm text-dust-700 bg-dust-50 border border-dust-200 rounded-lg px-3 py-2">
        {value}
      </div>
    </Field>
  );
}

export default function UserProfileModal({ user, onClose, onSaved, onImported, onLogout, onInvitesChanged }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [orcidId, setOrcidId] = useState(user.orcid_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OrcidPreviewResult | null>(null);

  const { data: names } = useLoad(async () => ({
    inst: user.institution_id
      ? (await api<Institution>("GET", `/api/institutions/${user.institution_id}`).catch(() => null))?.name
      : null,
    dept: user.department_id
      ? (await api<Department>("GET", `/api/departments/${user.department_id}`).catch(() => null))?.name
      : null,
  }), [user.institution_id, user.department_id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const raw = orcidId.trim();
    const normalized = raw ? normalizeOrcid(raw) : null;
    if (raw && !normalized) {
      setError(TEXT.profile.orcidInvalid);
      return;
    }
    setSaving(true);
    try {
      await api("PUT", "/api/auth/me", { name: name.trim() || null, orcid_id: normalized });
      if (normalized) setOrcidId(normalized);
      setSaved(true);
      onSaved();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setError("");
    setSaved(false);
    const raw = orcidId.trim();
    if (!raw) {
      setError(TEXT.profile.orcidMissing);
      return;
    }
    const normalized = normalizeOrcid(raw);
    if (!normalized) {
      setError(TEXT.profile.orcidInvalid);
      return;
    }
    setImporting(true);
    try {
      const res = await api<OrcidPreviewResult>("POST", "/api/orcid/preview", { orcid_id: normalized });
      setOrcidId(normalized);
      setPreview(res);
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setImporting(false);
    }
  }

  const footer = (
    <>
      <Button variant="danger" onClick={onLogout}>{TEXT.profile.logout}</Button>
      <div className="flex-1" />
      <Button variant="ghost" onClick={onClose}>{TEXT.common.close}</Button>
      <Button type="submit" form="profile-form" disabled={saving}>
        {saving ? TEXT.common.saving : TEXT.common.save}
      </Button>
    </>
  );

  return (
    <>
      <Drawer title={TEXT.profile.title} onClose={onClose} footer={footer} formId="profile-form" onSubmit={handleSave}>
        {error && <Banner tone="error" className="mb-4">{error}</Banner>}
        {saved && <Banner tone="success" className="mb-4">{TEXT.profile.saved}</Banner>}

        <Field label={TEXT.profile.name}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full"
          />
        </Field>

        <Readonly label={TEXT.profile.email} value={user.email} />
        <Readonly label={TEXT.profile.role} value={ROLE_LABELS[user.role]} />
        <Readonly label={TEXT.profile.institution} value={names?.inst ?? "—"} />
        <Readonly label={TEXT.profile.department} value={names?.dept ?? "—"} />

        <Field label={TEXT.profile.orcid}>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={orcidId}
              onChange={(e) => setOrcidId(e.target.value)}
              placeholder={TEXT.profile.orcidPlaceholder}
              disabled={saving || importing}
              className="flex-1 min-w-0 font-mono"
            />
            <Button variant="outline" onClick={handleImport} disabled={saving || importing} className="shrink-0">
              {importing ? TEXT.profile.importing : TEXT.profile.import}
            </Button>
          </div>
          <p className="text-xs text-dust-600 mt-1.5">{TEXT.profile.orcidHint}</p>
        </Field>

        <div className="mt-6 pt-5 border-t border-dust-200">
          <Inbox onChanged={() => { onInvitesChanged(); onSaved(); }} />
        </div>
      </Drawer>

      {preview && (
        <OrcidImportModal
          orcidId={normalizeOrcid(orcidId)!}
          preview={preview}
          onClose={() => setPreview(null)}
          onImported={() => { onImported(); onSaved(); }}
        />
      )}
    </>
  );
}
