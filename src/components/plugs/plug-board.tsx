"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlug, setExpandedPlug] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadPlugs = useCallback(async () => {
    try {
      const res = await fetch("/api/plugs", { credentials: "same-origin" });
      if (res.ok) setPlugs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugs();
  }, [loadPlugs]);

  async function togglePlug(id: string) {
    const plug = plugs.find((p) => p.id === id);
    if (!plug || toggling) return;

    setToggling(id);
    
    // Optimistic update
    setPlugs((prev) => prev.map((p) => p.id === id ? { ...p, isOn: !p.isOn } : p));
    
    try {
      const res = await fetch(`/api/plugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "toggle" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPlugs((prev) => prev.map((p) => p.id === id ? { ...updated } : p));
      } else {
        // Revert on error
        setPlugs((prev) => prev.map((p) => p.id === id ? { ...p, isOn: plug.isOn } : p));
      }
    } catch {
      setPlugs((prev) => prev.map((p) => p.id === id ? { ...p, isOn: plug.isOn } : p));
    } finally {
      setToggling(null);
    }
  }

  async function updateAutomation(id: string, automation: Partial<PlugAutomation>) {
    const res = await fetch(`/api/plugs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ automation }),
    });
    if (res.ok) await loadPlugs();
  }

  async function deletePlug(id: string) {
    await fetch(`/api/plugs/${id}`, { method: "DELETE", credentials: "same-origin" });
    await loadPlugs();
  }

  return (
    <div className="space-y-6">
      <div className="card-surface p-4">
        <p className="text-sm text-galv-dim leading-relaxed">
          Smart plugs show real-time power usage and can be turned on/off remotely. Set solar automation to turn plugs on when the sun is shining and battery is charged.
        </p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card-surface p-6">
            <div className="skeleton h-4 w-32 rounded mb-3" />
            <div className="skeleton h-8 w-full rounded" />
          </div>
        ) : plugs.length === 0 ? (
          <div className="card-surface p-8 text-center fade-in">
            <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-galv-dim fill-none mx-auto mb-4" strokeWidth={1}>
              <path d="M12 2v8M6.4 6.4l1.4 1.4M17.6 6.4l-1.4 1.4M3 12h2M19 12h2M6.4 17.6l1.4-1.4M17.6 17.6l-1.4-1.4M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
            </svg>
            <p className="text-sm text-galv-dim">
              No plugs found. Set up your Tapo account in Vercel env vars and the plugs will sync automatically.
            </p>
          </div>
        ) : (
          plugs.map((plug, index) => {
            const auto = parseAutomation(plug.automation);
            const isExpanded = expandedPlug === plug.id;
            const isToggling = toggling === plug.id;

            return (
              <div
                key={plug.id}
                className="card-surface p-4 fade-in-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => togglePlug(plug.id)}
                      disabled={isToggling}
                      className={`plug-toggle w-12 h-12 rounded-full flex items-center justify-center flex-none ${
                        plug.isOn
                          ? "on bg-green-950/50 border border-green-600/40"
                          : "off bg-steel-3 border border-line"
                      } ${isToggling ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      aria-label={plug.isOn ? "Turn off" : "Turn on"}
                    >
                      {isToggling ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-galv animate-spin" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className={`w-5 h-5 transition-colors ${plug.isOn ? "text-green-400" : "text-galv-dim"}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path d="M12 2v8M6.4 6.4l1.4 1.4M17.6 6.4l-1.4 1.4M3 12h2M19 12h2M6.4 17.6l1.4-1.4M17.6 17.6l-1.4-1.4M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="font-narrow font-bold text-sm text-paper truncate">{plug.name}</div>
                      <div className="font-narrow text-xs text-galv-dim flex items-center gap-1.5">
                        <span>{plug.room || "No room"}</span>
                        <span className="text-galv-dim/50">·</span>
                        <span>{plug.type}</span>
                        {plug.powerW > 0 && (
                          <>
                            <span className="text-galv-dim/50">·</span>
                            <span className="text-amber-400 value-change">{plug.powerW.toFixed(0)}W</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <span
                      className={`status-badge font-narrow uppercase tracking-wider text-[0.6rem] font-bold px-2 py-1 rounded ${
                        plug.isOn
                          ? "text-green-400 bg-green-950/30"
                          : "text-galv-dim bg-steel-3"
                      }`}
                    >
                      {plug.isOn ? "On" : "Off"}
                    </span>
                    {auto.enabled && (
                      <span className="status-badge font-narrow uppercase tracking-wider text-[0.55rem] text-amber-400 border border-amber-700/30 bg-amber-950/20 px-2 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedPlug(isExpanded ? null : plug.id)}
                      className="text-galv-dim hover:text-iron-lt transition-colors p-1 rounded hover:bg-steel-3"
                      aria-label="Settings"
                    >
                      <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deletePlug(plug.id)}
                      className="text-galv-dim hover:text-red-400 transition-colors p-1 rounded hover:bg-steel-3"
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="expand-content mt-4 pt-4 border-t border-line space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-narrow uppercase tracking-wider text-xs text-galv flex items-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7" />
                        </svg>
                        Solar Automation
                      </span>
                      <button
                        onClick={() => updateAutomation(plug.id, { enabled: !auto.enabled })}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                          auto.enabled ? "bg-amber-400" : "bg-steel-3 border border-line"
                        }`}
                        aria-label="Toggle automation"
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                            auto.enabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {auto.enabled && (
                      <div className="space-y-3 fade-in">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                              Solar above
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={auto.solarThresholdW}
                                onChange={(e) => updateAutomation(plug.id, { solarThresholdW: parseInt(e.target.value) || 0 })}
                                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
                              />
                              <span className="font-narrow text-xs text-galv-dim">W</span>
                            </div>
                          </div>
                          <div>
                            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                              Battery above
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={auto.batteryThresholdPct}
                                onChange={(e) => updateAutomation(plug.id, { batteryThresholdPct: parseInt(e.target.value) || 0 })}
                                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
                              />
                              <span className="font-narrow text-xs text-galv-dim">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim block mb-1">
                              Off below
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={auto.turnOffWhenBatteryBelow}
                                onChange={(e) => updateAutomation(plug.id, { turnOffWhenBatteryBelow: parseInt(e.target.value) || 0 })}
                                className="w-full bg-steel-3 border border-line rounded-lg px-3 py-1.5 text-paper text-sm focus:border-iron focus:outline-none transition-colors"
                              />
                              <span className="font-narrow text-xs text-galv-dim">%</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-amber-950/20 border border-amber-800/20 rounded-lg p-3 fade-in">
                          <p className="text-xs text-galv-dim leading-relaxed">
                            Turns on when solar &gt; {auto.solarThresholdW}W and battery &gt; {auto.batteryThresholdPct}%. Turns off when battery drops below {auto.turnOffWhenBatteryBelow}%.
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
