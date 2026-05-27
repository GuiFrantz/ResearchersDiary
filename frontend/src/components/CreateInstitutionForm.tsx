"use client";

import { useState } from "react";
import { api } from "@/lib/api";

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
      setError(err instanceof Error ? err.message : "Failed to create institution");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Institution name"
        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create"}
      </button>
      {error && (
        <div className="text-xs text-red-600 self-center">{error}</div>
      )}
    </form>
  );
}
