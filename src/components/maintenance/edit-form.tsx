"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartsEditor } from "@/components/maintenance/parts-editor";
import { getApiError } from "@/lib/api-client";
import { formatUtcDateOnly } from "@/lib/date-only";
import {
  parseMaintenanceParts,
  type MaintenancePart,
} from "@/lib/workflow-validation";

interface EditFormProps {
  itemId: string;
  name: string;
  category: string;
  description: string;
  intervalDays: number;
  intervalLabel: string;
  assignedTo: string;
  notes: string;
  parts: string;
  nextDueAt: string | null;
}

const categories = [
  { value: "water", label: "Water" },
  { value: "power", label: "Power" },
  { value: "generator", label: "Generator" },
  { value: "gas", label: "Gas" },
  { value: "wastewater", label: "Wastewater" },
  { value: "pool", label: "Pool" },
  { value: "internet", label: "Internet" },
  { value: "grounds", label: "Grounds" },
  { value: "general", label: "General" },
];

function serializedDueDate(value: string | null) {
  return value ? formatUtcDateOnly(new Date(value)) : "";
}

export function EditForm(props: EditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const [category, setCategory] = useState(props.category);
  const [description, setDescription] = useState(props.description);
  const [intervalDays, setIntervalDays] = useState(String(props.intervalDays));
  const [intervalLabel, setIntervalLabel] = useState(props.intervalLabel);
  const [assignedTo, setAssignedTo] = useState(props.assignedTo);
  const [notes, setNotes] = useState(props.notes);
  const [parts, setParts] = useState<MaintenancePart[]>(() =>
    parseMaintenanceParts(props.parts)
  );
  const initialDueDate = serializedDueDate(props.nextDueAt);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [dueDateDirty, setDueDateDirty] = useState(false);
  const displayedDueDate = dueDateDirty ? dueDate : initialDueDate;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const parsedInterval = Number(intervalDays);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 0) {
      setError("Interval must be a whole number of days.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name,
        category,
        description,
        intervalDays: parsedInterval,
        intervalLabel,
        assignedTo,
        notes,
        parts,
      };

      if (dueDateDirty) {
        body.nextDueAt = displayedDueDate || null;
      }

      const res = await fetch(`/api/maintenance/${props.itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError(await getApiError(res, "Failed to save maintenance details."));
        return;
      }

      setDueDate(displayedDueDate);
      setDueDateDirty(false);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(props.name);
    setCategory(props.category);
    setDescription(props.description);
    setIntervalDays(String(props.intervalDays));
    setIntervalLabel(props.intervalLabel);
    setAssignedTo(props.assignedTo);
    setNotes(props.notes);
    setParts(parseMaintenanceParts(props.parts));
    setDueDate(initialDueDate);
    setDueDateDirty(false);
    setEditing(false);
    setError("");
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="font-narrow uppercase tracking-wider text-xs font-bold text-galv border border-line hover:bg-steel-3 rounded-md px-4 py-2 transition-colors w-full"
      >
        Edit Details
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3">
          {error}
        </div>
      )}

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Interval (days)</label>
          <input
            type="number"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            min={0}
            className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Interval label</label>
          <input
            type="text"
            value={intervalLabel}
            onChange={(e) => setIntervalLabel(e.target.value)}
            maxLength={120}
            className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Assigned to</label>
        <input
          type="text"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          maxLength={160}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        />
      </div>

      <PartsEditor parts={parts} onChange={setParts} disabled={saving} />

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
          Due date {Number(intervalDays) > 0 && "(overrides auto-calc)"}
        </label>
        <input
          type="date"
          value={displayedDueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            setDueDateDirty(true);
          }}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
          rows={3}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md py-2.5 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="font-narrow uppercase tracking-wider text-xs text-galv border border-line hover:bg-steel-3 rounded-md px-4 py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
