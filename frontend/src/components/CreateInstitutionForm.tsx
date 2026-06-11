"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import { Button, Input } from "./ui";

interface Props {
  onCreated: () => void;
}

export default function CreateInstitutionForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await api("POST", "/api/institutions", { name: name.trim() });
      setName("");
      onCreated();
    } catch (err: unknown) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-md">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={TEXT.institution.placeholder}
        className="flex-1"
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? TEXT.institution.creating : TEXT.common.create}
      </Button>
      {error && <div className="text-xs text-clay self-center">{error}</div>}
    </form>
  );
}
