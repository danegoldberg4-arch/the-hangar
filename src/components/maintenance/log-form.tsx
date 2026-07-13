"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiError } from "@/lib/api-client";
import { dateOnlyInTimeZone, formatUtcDateOnly } from "@/lib/date-only";
import { parseMaintenanceParts } from "@/lib/workflow-validation";

interface LogFormProps {
  itemId: string;
  parts: string;
  userName: string;
}

export function LogForm({ itemId, parts, userName }: LogFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [completedAt, setCompletedAt] = useState(() =>
    formatUtcDateOnly(dateOnlyInTimeZone())
  );
  const [partSelection, setPartSelection] = useState({
    source: parts,
    indexes: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parsedParts = useMemo(() => parseMaintenanceParts(parts), [parts]);
  const selectedPartIndexes =
    partSelection.source === parts ? partSelection.indexes : [];

  function togglePart(index: number) {
    setPartSelection({
      source: parts,
      indexes: selectedPartIndexes.includes(index)
        ? selectedPartIndexes.filter((partIndex) => partIndex !== index)
        : [...selectedPartIndexes, index],
    });
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
          completedAt,
          partsUsed: selectedPartIndexes.map((index) => parsedParts[index]),
        }),
      });

      if (!res.ok) {
        throw new Error(await getApiError(res, "Failed to log completion."));
      }

      setNotes("");
      setPartSelection({ source: parts, indexes: [] });
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
            Parts used
          </p>
          <div className="space-y-2">
            {parsedParts.map((part, i) => (
              <label
                key={i}
                className="flex items-center gap-2 font-narrow text-xs text-sand cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPartIndexes.includes(i)}
                  onChange={() => togglePart(i)}
                  disabled={submitting}
                  className="accent-current"
                />
                <span>
                  {part.name}
                  {part.partNumber && ` / ${part.partNumber}`}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor={`completion-date-${itemId}`}
          className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1"
        >
          Completed on
        </label>
        <input
          id={`completion-date-${itemId}`}
          type="date"
          value={completedAt}
          onChange={(event) => setCompletedAt(event.target.value)}
          required
          disabled={submitting}
          className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none"
        />
      </div>

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
          maxLength={5000}
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
