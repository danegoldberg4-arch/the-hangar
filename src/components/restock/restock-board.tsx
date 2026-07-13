"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getApiError } from "@/lib/api-client";

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

async function fetchRestockItems(signal?: AbortSignal) {
  const res = await fetch("/api/restock?includeResolved=true&resolvedLimit=20", { credentials: "same-origin",
    signal,
  });
  if (!res.ok) throw new Error(await getApiError(res, "Could not load the restock list."));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("The restock list returned an invalid response.");
  return data as RestockItem[];
}

export function RestockBoard() {
  const { data: session } = useSession();
  const [items, setItems] = useState<RestockItem[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const [undoItem, setUndoItem] = useState<RestockItem | null>(null);
  const loadToken = useRef<symbol | null>(null);
  const loadController = useRef<AbortController | null>(null);

  const loadItems = useCallback(async () => {
    const token = Symbol("restock-load");
    loadToken.current = token;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchRestockItems(controller.signal);
      if (loadToken.current !== token) return;
      setItems(data);
    } catch (error) {
      if (controller.signal.aborted || loadToken.current !== token) return;
      setItems([]);
      setLoadError(error instanceof Error ? error.message : "Could not load the restock list.");
    } finally {
      if (loadToken.current === token) {
        loadToken.current = null;
        loadController.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const token = Symbol("restock-initial-load");
    loadToken.current = token;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    void fetchRestockItems(controller.signal)
      .then((data) => {
        if (loadToken.current !== token) return;
        setItems(data);
        setLoadError("");
      })
      .catch((error) => {
        if (controller.signal.aborted || loadToken.current !== token) return;
        setItems([]);
        setLoadError(error instanceof Error ? error.message : "Could not load the restock list.");
      })
      .finally(() => {
        if (loadToken.current === token) {
          loadToken.current = null;
          loadController.current = null;
          setLoading(false);
        }
      });
    return () => {
      loadToken.current = null;
      loadController.current?.abort();
      loadController.current = null;
    };
  }, []);

  function setItemPending(id: string, pending: boolean) {
    setPendingItemIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setMutationError("");

    try {
      const res = await fetch("/api/restock", { credentials: "same-origin",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note, category }),
      });

      if (!res.ok) throw new Error(await getApiError(res, "Could not add the item."));
      setName("");
      setNote("");
      setCategory("general");
      await loadItems();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Could not add the item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeResolution(item: RestockItem, action: "resolve" | "unresolve") {
    setItemPending(item.id, true);
    setMutationError("");
    try {
      const res = await fetch(`/api/restock/${item.id}`, { credentials: "same-origin",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        throw new Error(
          await getApiError(
            res,
            action === "resolve" ? "Could not mark the item as brought." : "Could not restore the item."
          )
        );
      }

      setUndoItem(action === "resolve" ? item : null);
      await loadItems();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Could not update the item.");
    } finally {
      setItemPending(item.id, false);
    }
  }

  async function deleteItem(item: RestockItem) {
    if (!window.confirm(`Delete "${item.name}" from the restock list? This cannot be undone.`)) {
      return;
    }

    setItemPending(item.id, true);
    setMutationError("");
    try {
      const res = await fetch(`/api/restock/${item.id}`, { credentials: "same-origin", method: "DELETE" });
      if (!res.ok) throw new Error(await getApiError(res, "Could not delete the item."));
      if (undoItem?.id === item.id) setUndoItem(null);
      await loadItems();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Could not delete the item.");
    } finally {
      setItemPending(item.id, false);
    }
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
            maxLength={160}
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
            maxLength={1000}
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

      {mutationError && (
        <div role="alert" className="bg-iron/5 border border-iron/20 text-iron text-sm rounded p-3">
          {mutationError}
        </div>
      )}

      {undoItem && (
        <div className="border border-green-900/30 bg-green-950/20 text-green-400 rounded p-3 flex items-center justify-between gap-3 text-sm">
          <span>{undoItem.name} marked as brought.</span>
          <button
            type="button"
            onClick={() => changeResolution(undoItem, "unresolve")}
            disabled={pendingItemIds.has(undoItem.id)}
            className="font-narrow uppercase tracking-wider text-xs font-bold hover:text-paper disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}

      {/* Active items */}
      <div>
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-3">
          Needs bringing ({active.length})
        </h3>
        {loading ? (
          <p className="text-galv text-sm">Loading...</p>
        ) : loadError ? (
          <div role="alert" className="card-surface border-iron/20 p-5">
            <p className="text-iron text-sm">{loadError}</p>
            <button
              type="button"
              onClick={() => loadItems()}
              className="font-narrow uppercase tracking-wider text-xs text-galv hover:text-paper mt-3"
            >
              Retry
            </button>
          </div>
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
                      onClick={() => changeResolution(item, "resolve")}
                      disabled={pendingItemIds.has(item.id)}
                      className="font-narrow uppercase tracking-wider text-[0.65rem] font-bold text-green-400 border border-green-900/30 hover:bg-green-950/30 px-3 py-1.5 rounded transition-colors"
                      title="Mark as brought"
                    >
                      Brought it
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(item)}
                    disabled={pendingItemIds.has(item.id)}
                    className="text-galv-dim hover:text-iron transition-colors text-xs px-1"
                    title="Delete"
                    aria-label={`Delete ${item.name}`}
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
      {!loading && !loadError && resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="font-narrow uppercase tracking-wider text-xs text-galv hover:text-iron transition-colors mb-3"
          >
            {showResolved ? "Hide" : "Show"} recently brought ({resolved.length})
          </button>
          {showResolved && (
            <div className="space-y-1">
              {resolved.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-galv-dim py-1.5 px-3"
                >
                  <span className="text-green-400">✓</span>
                  <span className="line-through">{item.name}</span>
                  <span className="sm:ml-auto font-narrow uppercase tracking-wider text-[0.6rem]">
                    Brought by {item.resolvedBy} · {timeAgo(new Date(item.resolvedAt!))}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeResolution(item, "unresolve")}
                    disabled={pendingItemIds.has(item.id)}
                    className="font-narrow uppercase tracking-wider text-[0.6rem] text-iron hover:text-iron-lt disabled:opacity-50"
                  >
                    Undo
                  </button>
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
