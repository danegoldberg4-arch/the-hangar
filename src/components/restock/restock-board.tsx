"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface RestockItem {
  id: string;
  name: string;
  note: string;
  category: string;
  addedBy: string;
  addedAt: string;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
}

const categories = [
  { value: "kitchen", label: "Kitchen", icon: "kitchen" },
  { value: "pantry", label: "Pantry", icon: "pantry" },
  { value: "bathroom", label: "Bathroom", icon: "bathroom" },
  { value: "cleaning", label: "Cleaning", icon: "cleaning" },
  { value: "hardware", label: "Hardware", icon: "hardware" },
  { value: "general", label: "General", icon: "general" },
];

const categoryColors: Record<string, string> = {
  kitchen: "text-amber-400 border-amber-900/30 bg-amber-950/20",
  pantry: "text-green-400 border-green-900/30 bg-green-950/20",
  bathroom: "text-sky-400 border-sky-900/30 bg-sky-950/20",
  cleaning: "text-purple-400 border-purple-900/30 bg-purple-950/20",
  hardware: "text-iron-lt border-iron/20 bg-iron/5",
  general: "text-galv border-line bg-steel-2",
};

export function RestockBoard() {
  const { data: session } = useSession();
  const [items, setItems] = useState<RestockItem[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/restock");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note, category }),
      });

      if (res.ok) {
        setName("");
        setNote("");
        setCategory("general");
        await loadItems();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveItem(id: string) {
    const res = await fetch(`/api/restock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve" }),
    });

    if (res.ok) {
      await loadItems();
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/restock/${id}`, { method: "DELETE" });
    await loadItems();
  }

  const active = items.filter((i) => !i.isResolved);
  const resolved = items.filter((i) => i.isResolved);

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleSubmit} className="card-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's run out? e.g. Tomato sauce, Coffee beans, Dishwasher tablets..."
            required
            className="flex-1 bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-steel-3 border border-line rounded-lg px-3 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (brand, size, where to buy...)"
            className="flex-1 bg-steel-3 border border-line rounded-lg px-4 py-2.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-5 py-2.5 rounded-md hover:bg-paper transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      {/* Active items */}
      <div>
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-3">
          Needs bringing ({active.length})
        </h3>
        {loading ? (
          <p className="text-galv text-sm">Loading...</p>
        ) : active.length === 0 ? (
          <div className="card-surface p-6 text-center">
            <p className="text-galv-dim text-sm">
              Everything&apos;s stocked. Nothing needed right now.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${categoryColors[item.category] || categoryColors.general}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-narrow font-bold text-sm text-paper">{item.name}</h4>
                    <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
                      {categories.find((c) => c.value === item.category)?.label || item.category}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-sm text-galv mt-1">{item.note}</p>
                  )}
                  <p className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim mt-2">
                    Added by {item.addedBy} · {timeAgo(new Date(item.addedAt))}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session?.user && (
                    <button
                      onClick={() => resolveItem(item.id)}
                      className="font-narrow uppercase tracking-wider text-[0.65rem] font-bold text-green-400 border border-green-900/30 hover:bg-green-950/30 px-3 py-1.5 rounded transition-colors"
                      title="Mark as brought"
                    >
                      Brought it
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-galv-dim hover:text-iron transition-colors text-xs px-1"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved items */}
      {resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="font-narrow uppercase tracking-wider text-xs text-galv hover:text-iron transition-colors mb-3"
          >
            {showResolved ? "Hide" : "Show"} recently brought ({resolved.length})
          </button>
          {showResolved && (
            <div className="space-y-1">
              {resolved.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm text-galv-dim py-1.5 px-3"
                >
                  <span className="text-green-400">✓</span>
                  <span className="line-through">{item.name}</span>
                  <span className="ml-auto font-narrow uppercase tracking-wider text-[0.6rem]">
                    Brought by {item.resolvedBy} · {timeAgo(new Date(item.resolvedAt!))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
