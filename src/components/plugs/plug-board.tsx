"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getApiError } from "@/lib/api-client";

interface PlugInventoryItem {
  id: string;
  name: string;
  type: string;
  deviceId: string;
  ip: string;
  room: string;
  createdAt: string;
}

export function PlugBoard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [plugs, setPlugs] = useState<PlugInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("tapo");
  const [deviceId, setDeviceId] = useState("");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPlugs = useCallback(async () => {
    try {
      const response = await fetch("/api/plugs", { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error(`Device inventory returned ${response.status}`);
      }
      setPlugs(await response.json());
      setError("");
    } catch {
      setError("Device inventory is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlugs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPlugs]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/plugs", { credentials: "same-origin",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, deviceId, room }),
      });
      if (!response.ok) {
        setError(await getApiError(response, "Failed to add device."));
        return;
      }
      setName("");
      setDeviceId("");
      setRoom("");
      setShowForm(false);
      await loadPlugs();
    } catch {
      setError("Failed to add device.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removePlug(id: string) {
    if (!window.confirm("Remove this device from the inventory?")) return;

    setError("");
    try {
      const response = await fetch(`/api/plugs/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) {
        setError(await getApiError(response, "Failed to remove device."));
        return;
      }
      await loadPlugs();
    } catch {
      setError("Failed to remove device.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-4 border-amber-900/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h2 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">
            Inventory only
          </h2>
        </div>
        <p className="text-sm text-galv-dim leading-relaxed">
          Physical state and remote control are unavailable until an authenticated edge agent is deployed.
        </p>
      </div>

      {isAdmin &&
        (!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md px-4 py-2.5 transition-colors"
          >
            Add device
          </button>
        ) : (
          <form onSubmit={handleAdd} className="card-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">
                New device
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="text-galv-dim hover:text-iron text-sm"
              >
                Close
              </button>
            </div>
            <label className="block">
              <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={160}
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                Type
              </span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              >
                <option value="tapo">TP-Link Tapo</option>
                <option value="shelly">Shelly</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="block">
              <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                Device ID or IP
              </span>
              <input
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                required
                maxLength={200}
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                Room
              </span>
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                maxLength={160}
                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="font-narrow uppercase tracking-wider text-xs text-galv border border-line hover:bg-steel-3 rounded-md px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        ))}

      {error && (
        <p role="alert" aria-live="assertive" className="text-iron text-sm">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-galv-dim">Loading...</p>
        ) : plugs.length === 0 ? (
          <div className="card-surface p-6 text-center text-sm text-galv-dim">
            No devices recorded.
          </div>
        ) : (
          plugs.map((plug) => (
            <div
              key={plug.id}
              className="card-surface p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-narrow font-bold text-sm text-paper truncate">
                  {plug.name}
                </div>
                <div className="font-narrow text-xs text-galv-dim truncate">
                  {plug.room || "No room"} · {plug.type} · {plug.deviceId}
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => removePlug(plug.id)}
                  className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim hover:text-iron flex-none"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
