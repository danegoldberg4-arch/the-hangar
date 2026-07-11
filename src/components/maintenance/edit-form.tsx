"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EditFormProps {
  itemId: string;
  name: string;
  category: string;
  description: string;
  intervalDays: number;
  intervalLabel: string;
  assignedTo: string;
  notes: string;
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

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [dueDate, setDueDate] = useState(
    props.nextDueAt ? formatDateLocal(new Date(props.nextDueAt)) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name,
        category,
        description,
        intervalDays: parseInt(intervalDays) || 0,
        intervalLabel,
        assignedTo,
        notes,
      };

      if (dueDate) {
        body.nextDueAt = new Date(dueDate).toISOString();
      } else if (props.nextDueAt) {
        body.nextDueAt = null;
      }

      const res = await fetch(`/api/maintenance/${props.itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

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
    setDueDate(props.nextDueAt ? formatDateLocal(new Date(props.nextDueAt)) : "");
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
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
          Due date {props.intervalDays > 0 && "(overrides auto-calc)"}
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
        />
      </div>

      <div>
        <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
