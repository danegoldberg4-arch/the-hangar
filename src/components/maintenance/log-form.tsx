"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogFormProps {
  itemId: string;
  parts: string;
  userName: string;
}

export function LogForm({ itemId, parts, userName }: LogFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  let parsedParts: { name: string; partNumber?: string }[] = [];
  try {
    parsedParts = JSON.parse(parts);
  } catch {
    // ignore
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/maintenance/${itemId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim(),
          partsUsed: parts,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log");
      }

      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parsedParts.length > 0 && (
        <div className="bg-steel-3 border border-line rounded-lg p-3">
          <p className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim mb-2">
            Parts for this task
          </p>
          <div className="flex flex-wrap gap-2">
            {parsedParts.map((part, i) => (
              <span
                key={i}
                className="font-narrow text-xs bg-steel-3 text-sand px-2 py-1 rounded tracking-wide"
              >
                {part.name}
                {part.partNumber && ` · ${part.partNumber}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
          Logged by
        </label>
        <div className="w-full bg-steel-3/50 border border-line/50 rounded-lg px-4 py-2.5 text-galv text-sm">
          {userName}
        </div>
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What was done, any issues, parts replaced..."
          rows={3}
          className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors resize-none"
        />
      </div>

      {error && <p className="text-iron text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-5 py-2.5 rounded-md hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Logging..." : "Log Completion"}
      </button>
    </form>
  );
}
