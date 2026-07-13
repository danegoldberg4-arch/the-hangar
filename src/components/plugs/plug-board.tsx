"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Plug {
  id: string;
  name: string;
  type: string;
  deviceId: string;
  room: string;
  isOn: boolean;
  powerW: number;
  automation: string;
  lastSeen: string | null;
}

interface PlugAutomation {
  enabled: boolean;
  solarThresholdW: number;
  batteryThresholdPct: number;
  turnOffWhenBatteryBelow: number;
}

function parseAutomation(data: string): PlugAutomation {
  try {
    return { enabled: false, solarThresholdW: 2000, batteryThresholdPct: 80, turnOffWhenBatteryBelow: 50, ...JSON.parse(data) };
  } catch {
    return { enabled: false, solarThresholdW: 2000, batteryThresholdPct: 80, turnOffWhenBatteryBelow: 50 };
  }
}

export function PlugBoard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("tapo");
  const [deviceId, setDeviceId] = useState("");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPlug, setExpandedPlug] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPlugs = useCallback(async () => {
    try {
      const res = await fetch("/api/plugs");
      if (res.ok) setPlugs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugs();
  }, [loadPlugs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/plugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, deviceId, room }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add plug");
        return;
      }

      setName("");
      setDeviceId("");
      setRoom("");
      setShowForm(false);
      await loadPlugs();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePlug(id: string) {
    const res = await fetch(`/api/plugs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    if (res.ok) await loadPlugs();
  }

  async function updateAutomation(id: string, automation: Partial<PlugAutomation>) {
    const res = await fetch(`/api/plugs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation }),
    });
    if (res.ok) await loadPlugs();
  }

  async function deletePlug(id: string) {
    await fetch(`/api/plugs/${id}`, { method: "DELETE" });
    await loadPlugs();
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="card-surface p-4">
        <p className="text-sm text-galv-dim leading-relaxed">
          Smart plugs let you turn appliances on/off remotely and automate based on solar conditions. Set a plug to turn on automatically when solar generation is high and battery is charged — perfect for running the dishwasher, pool pump, or charging batteries while the sun shines.
        </p>
      </div>

      {/* Add button / form */}
      {isAdmin && (!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md px-4 py-2.5 transition-colors"
        >
          + Add Plug
        </button>
      ) : (
        <form onSubmit={handleAdd} className="card-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">New Plug</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-galv-dim hover:text-iron text-sm">×</button>
          </div>

          <div>
            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Dishwasher, Pool Pump, Battery Charger"
              className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            >
              <option value="tapo">TP-Link Tapo</option>
              <option value="shelly">Shelly</option>
              <option value="manual">Manual (no API)</option>
            </select>
          </div>

          <div>
            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Device ID / IP</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              placeholder="Tapo device ID or Shelly IP (e.g. 192.168.1.50)"
              className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">Room</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Kitchen, Laundry, Pool"
              className="w-full bg-steel-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
            />
          </div>

          {error && <p className="text-iron text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand hover:bg-paper rounded-md px-4 py-2 transition-colors disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Plug"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="font-narrow uppercase tracking-wider text-xs text-galv border border-line hover:bg-steel-3 rounded-md px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ))}

      {/* Plugs list */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-galv-dim">Loading...</p>
        ) : plugs.length === 0 ? (
          <div className="card-surface p-6 text-center">
            <p className="text-sm text-galv-dim">
              No plugs are configured yet.
            </p>
          </div>
        ) : (
          plugs.map((plug) => {
            const auto = parseAutomation(plug.automation);
            const isExpanded = expandedPlug === plug.id;

            return (
              <div key={plug.id} className="card-surface p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => togglePlug(plug.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-none ${
                        plug.isOn
                          ? "bg-green-950/40 border border-green-700/40"
                          : "bg-steel-3 border border-line"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${plug.isOn ? "text-green-400" : "text-galv-dim"}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M12 2v8M6.4 6.4l1.4 1.4M17.6 6.4l-1.4 1.4M3 12h2M19 12h2M6.4 17.6l1.4-1.4M17.6 17.6l-1.4-1.4M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
                      </svg>
                    </button>
                    <div className="min-w-0">
                      <div className="font-narrow font-bold text-sm text-paper truncate">{plug.name}</div>
                      <div className="font-narrow text-xs text-galv-dim">
                        {plug.room || "No room"} · {plug.type}
                        {plug.powerW > 0 && ` · ${plug.powerW.toFixed(0)}W`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${plug.isOn ? "text-green-400" : "text-galv-dim"}`}>
                      {plug.isOn ? "On" : "Off"}
                    </span>
                    {auto.enabled && (
                      <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-amber-400 border border-amber-900/30 bg-amber-950/20 px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setExpandedPlug(isExpanded ? null : plug.id)}
                          className="text-galv-dim hover:text-iron text-xs px-1"
                        >
                          {isExpanded ? "−" : "⚙"}
                        </button>
                        <button
                          onClick={() => deletePlug(plug.id)}
                          className="text-galv-dim hover:text-iron text-xs px-1"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Automation settings */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-line space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-narrow uppercase tracking-wider text-xs text-galv">Solar Automation</span>
                      <button
                        onClick={() => updateAutomation(plug.id, { enabled: !auto.enabled })}
                        className={`font-narrow uppercase tracking-wider text-[0.6rem] font-bold px-2.5 py-1 rounded-md transition-colors ${
                          auto.enabled
                            ? "bg-amber-400 text-steel"
                            : "text-galv-dim border border-line hover:bg-steel-3"
                        }`}
                      >
                        {auto.enabled ? "On" : "Off"}
                      </button>
                    </div>

                    {auto.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                            Turn on when solar exceeds
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={auto.solarThresholdW}
                              onChange={(e) => updateAutomation(plug.id, { solarThresholdW: parseInt(e.target.value) || 0 })}
                              className="w-24 bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none"
                            />
                            <span className="font-narrow text-sm text-galv-dim">W</span>
                          </div>
                        </div>

                        <div>
                          <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                            And battery is above
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={auto.batteryThresholdPct}
                              onChange={(e) => updateAutomation(plug.id, { batteryThresholdPct: parseInt(e.target.value) || 0 })}
                              className="w-24 bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none"
                            />
                            <span className="font-narrow text-sm text-galv-dim">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                            Turn off when battery drops below
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={auto.turnOffWhenBatteryBelow}
                              onChange={(e) => updateAutomation(plug.id, { turnOffWhenBatteryBelow: parseInt(e.target.value) || 0 })}
                              className="w-24 bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none"
                            />
                            <span className="font-narrow text-sm text-galv-dim">%</span>
                          </div>
                        </div>

                        <div className="bg-amber-950/20 border border-amber-900/20 rounded-lg p-3">
                          <p className="font-narrow text-xs text-amber-400 mb-1">How it works</p>
                          <p className="text-xs text-galv-dim leading-relaxed">
                            Plug turns on automatically when solar generation exceeds {auto.solarThresholdW}W AND battery is above {auto.batteryThresholdPct}%. It turns off when battery drops below {auto.turnOffWhenBatteryBelow}%. Perfect for running appliances when there&apos;s surplus solar.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
