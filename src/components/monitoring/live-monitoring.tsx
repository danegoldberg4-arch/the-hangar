"use client";

import { useState, useEffect, useCallback } from "react";
import { WeatherIcon } from "@/components/weather/weather-icon";

interface MonitoringData {
  power: {
    batterySoc: number;
    solarW: number;
    loadW: number;
    gridW: number;
    genRunning: boolean;
    genStatus: number;
    freshness: string;
  } | null;
  weather: {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: number;
    precipitation: number;
    weatherCode: number;
  } | null;
  sunTimes: { sunrise: string; sunset: string } | null;
  fireDanger: {
    dangerToday: string;
    dangerTomorrow: string;
    fireBanToday: boolean;
  } | null;
  warnings: { title: string; link: string }[];
  starlink: {
    connected: boolean;
    latencyMs: number | null;
    downlinkThroughputBps: number | null;
  } | null;
  generatorETA: string | null;
}

function formatPower(w: number): string {
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(1)}kW`;
  return `${Math.round(w)}W`;
}

const BATTERY_KWH = 26.1;
const GEN_TRIGGER = 30;

function calcETA(soc: number, solarW: number, loadW: number): string {
  const netDrain = loadW - solarW;
  if (netDrain <= 0) return "Charging";
  const remainingPct = soc - GEN_TRIGGER;
  if (remainingPct <= 0) return "At trigger";
  const remainingKwh = (remainingPct / 100) * BATTERY_KWH;
  const hours = remainingKwh / (netDrain / 1000);
  if (hours < 1) return `~${Math.round(hours * 60)}m`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
  }
  return `~${Math.floor(hours / 24)}d`;
}

const fireDangerConfig: Record<string, { label: string; color: string; dot: string }> = {
  NONE: { label: "None", color: "text-galv-dim", dot: "bg-galv-dim" },
  MODERATE: { label: "Moderate", color: "text-green-400", dot: "bg-green-500" },
  HIGH: { label: "High", color: "text-amber-400", dot: "bg-amber-500" },
  EXTREME: { label: "Extreme", color: "text-red-400", dot: "bg-red-500" },
  CATASTROPHIC: { label: "Catastrophic", color: "text-red-300", dot: "bg-red-400" },
};

const WMO_CODES: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

function windDirText(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function LiveMonitoring({ initialData }: { initialData: MonitoringData | null }) {
  const [data, setData] = useState<MonitoringData | null>(initialData);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/monitoring", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch {
      // keep existing data
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const doRefresh = () => { void refresh(); };
    doRefresh();
    const interval = setInterval(doRefresh, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [visible, refresh]);

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power</h3>
          </div>
          <div className="font-narrow font-bold text-3xl text-galv-dim">—%</div>
        </div>
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-galv-dim" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Generator</h3>
          </div>
          <div className="font-narrow font-bold text-xl text-galv-dim">Standby</div>
        </div>
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Weather</h3>
          </div>
          <div className="font-narrow font-bold text-3xl text-galv-dim">—°</div>
        </div>
      </div>
    );
  }

  const power = data.power;
  const weather = data.weather;
  const fdr = data.fireDanger ? fireDangerConfig[data.fireDanger.dangerToday] : null;
  const eta = power && !power.genRunning
    ? calcETA(power.batterySoc, power.solarW, power.loadW)
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Power */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${power?.freshness === "live" ? "glow-dot text-amber-400" : ""}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${power?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
            {power?.freshness || "—"}
          </span>
        </div>
        {power ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className={`font-narrow font-bold text-3xl ${power.batterySoc < 30 ? "text-red-400" : power.batterySoc < 60 ? "text-amber-400" : "text-green-400"}`}>
                {power.batterySoc.toFixed(0)}
              </span>
              <span className="font-narrow text-sm text-galv-dim">%</span>
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-auto">Battery</span>
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-narrow font-bold text-lg text-amber-400">{formatPower(power.solarW)}</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Solar</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-lg text-paper">{formatPower(power.loadW)}</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Load</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Power telemetry unavailable.</p>
        )}
      </div>

      {/* Generator */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${power?.genRunning ? "bg-amber-400 glow-dot text-amber-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Generator</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${power?.genRunning ? "text-amber-400" : "text-galv-dim"}`}>
            {power ? (power.genRunning ? "running" : "standby") : "—"}
          </span>
        </div>
        {power ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${power.genRunning ? "bg-amber-950/40 border border-amber-700/40" : "bg-steel-3 border border-line"}`}>
                <svg viewBox="0 0 24 24" className={`w-6 h-6 ${power.genRunning ? "text-amber-400" : "text-galv-dim"}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M7 10v4M11 10v4M15 10v4M19 10v4" />
                </svg>
              </div>
              <div className={`font-narrow font-bold text-xl ${power.genRunning ? "text-amber-400" : "text-galv"}`}>
                {power.genRunning ? "Running" : "Standby"}
              </div>
            </div>
            {power.genRunning && (
              <>
                <div className="h-px bg-line" />
                <div className="flex items-baseline gap-1">
                  <span className="font-narrow font-bold text-2xl text-amber-400">{formatPower(Math.abs(power.gridW))}</span>
                  <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-auto">Output</span>
                </div>
              </>
            )}
            {!power.genRunning && eta && (
              <>
                <div className="h-px bg-line" />
                <div>
                  <div className="font-narrow text-[0.55rem] text-galv-dim uppercase tracking-wider mb-1">
                    Est. until auto-start
                  </div>
                  <div className="font-narrow font-bold text-base text-iron-lt">
                    {eta}
                  </div>
                  <div className="font-narrow text-[0.55rem] text-galv-dim mt-1">
                    At current usage · triggers at {GEN_TRIGGER}%
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Connect select.live to see generator status.</p>
        )}
      </div>

      {/* Weather */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 glow-dot text-sky-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Weather</h3>
          </div>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
            Kangaroo Valley
          </span>
        </div>
        {weather ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-amber-400 w-8 h-8 flex-none">
                <WeatherIcon code={weather.weatherCode} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-narrow font-bold text-3xl text-paper">{weather.temp.toFixed(0)}</span>
                <span className="font-narrow text-sm text-galv-dim">°C</span>
              </div>
              <span className="font-narrow text-xs text-galv ml-auto">{WMO_CODES[weather.weatherCode] || "—"}</span>
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">{weather.humidity}%</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Humidity</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">
                  {weather.windSpeed.toFixed(0)}<span className="text-xs text-galv-dim ml-0.5">km/h</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">{windDirText(weather.windDir)}</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">{weather.precipitation.toFixed(1)}mm</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Rain</div>
              </div>
            </div>
            {data.sunTimes && (
              <>
                <div className="h-px bg-line" />
                <div className="flex items-center justify-between">
                  <span className="font-narrow text-galv-dim flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
                    </svg>
                    <span className="text-paper text-sm">{data.sunTimes.sunrise.split("T")[1]}</span>
                  </span>
                  <span className="font-narrow text-galv-dim flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-iron-lt" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    <span className="text-paper text-sm">{data.sunTimes.sunset.split("T")[1]}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Fetching weather...</p>
        )}
      </div>

      {/* Fire Danger */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${fdr?.dot || "bg-galv-dim"} glow-dot`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Fire Danger</h3>
          </div>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Illawarra/Shoalhaven</span>
        </div>
        {fdr && data.fireDanger ? (
          <div className="space-y-3">
            <div>
              <div className={`font-narrow font-bold text-2xl ${fdr.color}`}>{fdr.label}</div>
              <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">Today</div>
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Tomorrow</span>
              <span className={`font-narrow uppercase tracking-wider text-xs font-bold ${fireDangerConfig[data.fireDanger.dangerTomorrow]?.color || "text-galv"}`}>
                {fireDangerConfig[data.fireDanger.dangerTomorrow]?.label || data.fireDanger.dangerTomorrow}
              </span>
            </div>
            {data.fireDanger.fireBanToday && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                <span className="font-narrow uppercase tracking-wider text-[0.6rem]">Total Fire Ban Today</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Fetching from RFS...</p>
        )}
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="card-surface p-4 sm:p-5 border-amber-900/30 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">
              Warnings ({data.warnings.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {data.warnings.slice(0, 3).map((w, i) => (
              <a key={i} href={w.link} target="_blank" rel="noopener noreferrer" className="block text-xs text-galv hover:text-paper transition-colors leading-relaxed">
                {w.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Starlink */}
      <div className={`card-surface p-4 sm:p-5 fade-in ${data.warnings.length === 0 ? "sm:col-span-1" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${data.starlink?.connected ? "bg-green-400 glow-dot text-green-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Starlink</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${data.starlink?.connected ? "text-green-400" : "text-galv-dim"}`}>
            {data.starlink?.connected ? "online" : "offline"}
          </span>
        </div>
        {data.starlink ? (
          <div className="grid grid-cols-2 gap-2">
            {data.starlink.latencyMs !== null && (
              <div>
                <div className="font-narrow font-bold text-lg text-paper">{data.starlink.latencyMs?.toFixed(0)}ms</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Latency</div>
              </div>
            )}
            {data.starlink.downlinkThroughputBps !== null && (
              <div>
                <div className="font-narrow font-bold text-lg text-paper">
                  {((data.starlink.downlinkThroughputBps || 0) / 1e6).toFixed(1)}<span className="text-xs text-galv-dim ml-0.5">Mbps</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Download</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim leading-relaxed">
            Waiting for Pi relay. Set <code className="text-iron text-[0.7rem] bg-steel-3 px-1 rounded">INGEST_TOKEN</code> in .env.
          </p>
        )}
      </div>
    </div>
  );
}
