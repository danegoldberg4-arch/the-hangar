"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

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

export default function NewMaintenanceItemPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [intervalDays, setIntervalDays] = useState("0");
  const [intervalLabel, setIntervalLabel] = useState("As needed");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session.user.role !== "admin") {
      router.replace("/maintenance");
    }
  }, [router, session, status]);

  if (status !== "authenticated" || session.user.role !== "admin") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          description,
          intervalDays: parseInt(intervalDays) || 0,
          intervalLabel,
          assignedTo,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create item");
        return;
      }

      router.push("/maintenance");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
      <Link
        href="/maintenance"
        className="font-narrow uppercase tracking-wider text-xs text-galv hover:text-iron transition-colors mb-4 inline-block"
      >
        ← Back to maintenance
      </Link>

      <h1 className="font-narrow font-bold uppercase text-2xl sm:text-3xl tracking-tight text-paper mb-8">
        New Maintenance Item
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Pool pump service"
            className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What needs to be done..."
            className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
              Interval (days)
            </label>
            <input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              min={0}
              className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            />
            <p className="text-xs text-galv-dim mt-1">0 = as needed</p>
          </div>
          <div>
            <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
              Interval label
            </label>
            <input
              type="text"
              value={intervalLabel}
              onChange={(e) => setIntervalLabel(e.target.value)}
              placeholder="e.g. Every 3 months"
              className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
            Assigned to
          </label>
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="e.g. Owner, Sebastian, Technician..."
            className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="font-narrow uppercase tracking-wider text-xs text-galv-dim block mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes, part numbers, reminders..."
            className="w-full bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-5 py-2.5 rounded-md hover:bg-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Item"}
          </button>
          <Link
            href="/maintenance"
            className="font-narrow uppercase tracking-wider text-xs font-bold text-galv border border-line px-5 py-2.5 rounded-md hover:bg-steel-3 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
