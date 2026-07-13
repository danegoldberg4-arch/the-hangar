"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  FRESHNESS_THRESHOLDS,
  advanceObservationMeta,
  freshnessLabel,
  type ObservationMeta,
} from "@/lib/integrations/freshness";

interface KioskData {
  power: ObservationMeta & {
    batterySoc: number;
    solarW: number;
    loadW: number;
    genRunning: boolean;
    gridW: number;
  } | null;
  weather: ObservationMeta & {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: number;
    precipitation: number;
    weatherCode: number;
  } | null;
  forecast: ObservationMeta & {
    daily: { date: string; maxTemp: number; minTemp: number; precipitation: number; weatherCode: number }[];
  } | null;
  fireDanger: ObservationMeta & {
    reportDate: string;
    dangerToday: string;
    dangerTomorrow: string;
    fireBanToday: boolean;
  } | null;
  rain: ObservationMeta & {
    today: number;
    week: number;
    month: number;
    history: { date: string; total: number }[];
  } | null;
  sunTimes: ObservationMeta & { sunrise: string; sunset: string } | null;
  powerHistory: { time: string; batterySoc: number; solarW: number; loadW: number }[];
  alerts: { name: string; daysOverdue: number }[];
  restockCount: number;
  visits: { visitorName: string; startDate: string; endDate: string }[];
  generatedAt: string;
}

const fireDangerConfig: Record<string, { label: string; color: string }> = {
  NONE: { label: "None", color: "text-galv-dim" },
  MODERATE: { label: "Moderate", color: "text-green-400" },
  HIGH: { label: "High", color: "text-amber-400" },
  EXTREME: { label: "Extreme", color: "text-red-400" },
  CATASTROPHIC: { label: "Catastrophic", color: "text-red-300" },
};

const WMO_CODES: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatPower(w: number): string {
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(1)}kW`;
  return `${Math.round(w)}W`;
}

function windDirText(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function refreshMeta<T extends ObservationMeta>(
  value: T | null,
  liveForMs: number,
  elapsedMs: number,
  forceStale: boolean
): T | null {
  if (!value) return null;
  const meta = advanceObservationMeta(value, liveForMs, elapsedMs, forceStale);
  return {
    ...value,
    ...meta,
  };
}

// Kiosk metadata — set via layout

export default function KioskPage() {
  const [snapshotState, setSnapshot] = useState<{
    data: KioskData;
    receivedAtMs: number;
  } | null>(null);
  const [time, setTime] = useState(new Date());
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/kiosk");
        if (!res.ok) throw new Error(`Kiosk API returned ${res.status}`);
        setSnapshot({ data: await res.json(), receivedAtMs: Date.now() });
        setLoadError(false);
      } catch (e) {
        console.error("kiosk load error", e);
        setLoadError(true);
      }
    }
    load();
    const dataInterval = setInterval(load, 60000);
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  if (!snapshotState) {
    return (
      <div className="min-h-screen bg-steel flex items-center justify-center">
        <div className="text-center">
          <img src="/hangar-emblem.png" alt="The Hangar" className="w-16 h-16 mx-auto mb-4 rounded-2xl animate-pulse" />
          <p className="font-narrow uppercase tracking-wider text-sm text-galv-dim">
            {loadError ? "Monitoring unavailable" : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const snapshot = snapshotState.data;
  const elapsedMs = Math.max(0, time.getTime() - snapshotState.receivedAtMs);
  const generatedAtMs = Date.parse(snapshot.generatedAt);
  const displayTime = Number.isFinite(generatedAtMs)
    ? new Date(generatedAtMs + elapsedMs)
    : time;
  const todayKey = displayTime.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Australia/Sydney",
  });
  const fireDanger = refreshMeta(
    snapshot.fireDanger,
    Number.MAX_SAFE_INTEGER,
    elapsedMs,
    loadError
  );
  const data: KioskData = {
    ...snapshot,
    power: refreshMeta(
      snapshot.power,
      FRESHNESS_THRESHOLDS.power,
      elapsedMs,
      loadError
    ),
    weather: refreshMeta(
      snapshot.weather,
      FRESHNESS_THRESHOLDS.weather,
      elapsedMs,
      loadError
    ),
    forecast: refreshMeta(
      snapshot.forecast,
      FRESHNESS_THRESHOLDS.forecast,
      elapsedMs,
      loadError
    ),
    fireDanger:
      fireDanger &&
      fireDanger.freshness !== "unavailable" &&
      fireDanger.reportDate !== todayKey
        ? { ...fireDanger, freshness: "stale" }
        : fireDanger,
    rain: refreshMeta(
      snapshot.rain,
      FRESHNESS_THRESHOLDS.rain,
      elapsedMs,
      loadError
    ),
    sunTimes: refreshMeta(
      snapshot.sunTimes,
      FRESHNESS_THRESHOLDS.forecast,
      elapsedMs,
      loadError
    ),
  };
  const fdr = data.fireDanger ? fireDangerConfig[data.fireDanger.dangerToday] : null;

  return (
    <div className="min-h-screen bg-steel text-paper p-3 sm:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/hangar-emblem.png" alt="The Hangar" className="w-9 h-9 rounded-xl" />
          <div>
            <h1 className="font-narrow font-bold uppercase text-xl tracking-tight text-paper">The Hangar</h1>
            <p className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">Upper Kangaroo River · NSW</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-narrow font-bold text-3xl text-paper">
            {displayTime.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Australia/Sydney",
            })}
          </div>
          <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">
            {displayTime.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Australia/Sydney",
            })}
          </div>
        </div>
      </div>

      {/* Alerts banner */}
      {loadError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 border border-amber-900/30 bg-amber-950/10 rounded-lg p-3 font-narrow uppercase tracking-wider text-xs text-amber-400"
        >
          Refresh failed. Showing the last received dashboard snapshot.
        </div>
      )}

      {data.alerts.length > 0 && (
        <div className="mb-4 border border-iron/30 bg-iron/5 rounded-xl p-4 flex items-center gap-4 fade-in">
          <span className="w-2 h-2 rounded-full bg-iron glow-dot text-iron" />
          {data.alerts.map((a, i) => (
            <span key={i} className="font-narrow uppercase tracking-wider text-sm text-iron">
              {a.name} — {Math.abs(a.daysOverdue)}d overdue
            </span>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {/* Power — big card */}
        <div className="card-surface p-5 fade-in sm:col-span-2 xl:row-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.power?.freshness === "live" ? "bg-amber-400 glow-dot text-amber-400" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Power</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-xs ${data.power?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.power ? freshnessLabel(data.power) : "unavailable"}
            </span>
          </div>
          {data.power ? (
            <>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`font-narrow font-bold text-6xl ${data.power.batterySoc < 30 ? "text-red-400" : data.power.batterySoc < 60 ? "text-amber-400" : "text-green-400"}`}>
                  {data.power.batterySoc.toFixed(0)}
                </span>
                <span className="font-narrow text-2xl text-galv-dim">% battery</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="font-narrow font-bold text-2xl text-amber-400">{formatPower(data.power.solarW)}</div>
                  <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">Solar</div>
                </div>
                <div>
                  <div className="font-narrow font-bold text-2xl text-paper">{formatPower(data.power.loadW)}</div>
                  <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">Load</div>
                </div>
                <div>
                  <div className={`font-narrow font-bold text-2xl ${data.power.freshness === "live" && data.power.genRunning ? "text-amber-400" : "text-galv-dim"}`}>
                    {data.power.freshness === "live"
                      ? data.power.genRunning ? "Running" : "Standby"
                      : data.power.genRunning ? "Last report: on" : "Last report: off"}
                  </div>
                  <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">Generator</div>
                </div>
              </div>
              {data.powerHistory.length > 1 && (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={data.powerHistory} margin={{ top: 5, right: -10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kSolarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,161,171,0.08)" />
                    <XAxis dataKey="time" tick={{ fill: "#646b75", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={50} />
                    <YAxis yAxisId="watts" tick={{ fill: "#646b75", fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`} />
                    <YAxis yAxisId="battery" orientation="right" domain={[0, 100]} tick={{ fill: "#646b75", fontSize: 10 }} tickLine={false} axisLine={false} width={35} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip contentStyle={{ background: "#16191e", border: "1px solid rgba(154,161,171,0.12)", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="solarW" name="Solar" stroke="#f59e0b" strokeWidth={1.5} fill="url(#kSolarGrad)" yAxisId="watts" />
                    <Area type="monotone" dataKey="loadW" name="Load" stroke="#38bdf8" strokeWidth={1.5} fill="rgba(56,189,248,0.1)" yAxisId="watts" />
                    <Line type="monotone" dataKey="batterySoc" name="Battery %" stroke="#4ade80" strokeWidth={2} dot={false} yAxisId="battery" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <p className="text-galv-dim">Power telemetry unavailable</p>
          )}
        </div>

        {/* Weather */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.weather?.freshness === "live" ? "bg-sky-400 glow-dot text-sky-400" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Weather</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${data.weather?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.weather ? freshnessLabel(data.weather) : "unavailable"}
            </span>
          </div>
          {data.weather ? (
            <div>
              <div className="font-narrow font-bold text-4xl text-paper mb-1">
                {data.weather.temp.toFixed(0)}°
              </div>
              <div className="font-narrow text-sm text-galv mb-3">
                {WMO_CODES[data.weather.weatherCode] || "—"}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-galv-dim">Humidity</span>
                  <span className="text-paper">{data.weather.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-galv-dim">Wind</span>
                  <span className="text-paper">{data.weather.windSpeed.toFixed(0)} km/h {windDirText(data.weather.windDir)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-galv-dim">Rain</span>
                  <span className="text-paper">{data.weather.precipitation.toFixed(1)}mm</span>
                </div>
              </div>
            </div>
          ) : <p className="text-galv-dim text-sm">Weather unavailable</p>}
        </div>

        {/* Fire Danger */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.fireDanger?.freshness === "live" ? "bg-red-500 glow-dot text-red-500" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Fire Danger</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${data.fireDanger?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.fireDanger ? freshnessLabel(data.fireDanger) : "unavailable"}
            </span>
          </div>
          {fdr && data.fireDanger ? (
            <div>
              <div className={`font-narrow font-bold text-3xl ${fdr.color} mb-1`}>
                {fdr.label}
              </div>
              <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim mb-3">
                {data.fireDanger.freshness === "live" ? "Today" : "Last report"}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-galv-dim">
                  {data.fireDanger.freshness === "live" ? "Tomorrow" : "Next day in report"}
                </span>
                <span className={`font-bold ${fireDangerConfig[data.fireDanger.dangerTomorrow]?.color || "text-galv"}`}>
                  {fireDangerConfig[data.fireDanger.dangerTomorrow]?.label || data.fireDanger.dangerTomorrow}
                </span>
              </div>
              {data.fireDanger.fireBanToday && (
                <div className="mt-2 text-red-400 font-narrow uppercase tracking-wider text-xs">
                  {data.fireDanger.freshness === "live" ? "Total Fire Ban" : "Last report: Total Fire Ban"}
                </div>
              )}
            </div>
          ) : <p className="text-galv-dim text-sm">Fire danger unavailable</p>}
        </div>

        {/* Sunrise/Sunset */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.sunTimes?.freshness === "live" ? "bg-amber-400 glow-dot text-amber-400" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Sun</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${data.sunTimes?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.sunTimes ? freshnessLabel(data.sunTimes) : "unavailable"}
            </span>
          </div>
          {data.sunTimes ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
                </svg>
                <div>
                  <div className="font-narrow font-bold text-xl text-paper">{data.sunTimes.sunrise.split("T")[1]}</div>
                  <div className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">Sunrise</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-iron-lt" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <div>
                  <div className="font-narrow font-bold text-xl text-paper">{data.sunTimes.sunset.split("T")[1]}</div>
                  <div className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">Sunset</div>
                </div>
              </div>
            </div>
          ) : <p className="text-galv-dim text-sm">Sun times unavailable</p>}
        </div>

        {/* Forecast */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.forecast?.freshness === "live" ? "bg-sky-400" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Forecast</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${data.forecast?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.forecast ? freshnessLabel(data.forecast) : "unavailable"}
            </span>
          </div>
          {data.forecast ? (
            <div className="grid grid-cols-5 gap-2">
              {data.forecast.daily.map((day, i) => {
                const dayIndex = new Date(`${day.date}T00:00:00Z`).getUTCDay();
                return (
                  <div key={day.date} className="text-center">
                    <div className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
                      {i === 0 ? "Today" : dayNames[dayIndex]}
                    </div>
                    <div className="font-narrow font-bold text-lg text-paper mt-1">{day.maxTemp.toFixed(0)}°</div>
                    <div className="font-narrow text-xs text-galv-dim">{day.minTemp.toFixed(0)}°</div>
                    {day.precipitation > 0 && <div className="font-narrow text-[0.6rem] text-sky-400">{day.precipitation}mm</div>}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-galv-dim text-sm">Forecast unavailable</p>}
        </div>

        {/* Rainfall */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.rain?.freshness === "live" ? "bg-sky-400" : "bg-galv-dim"}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Rainfall</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-[0.6rem] ${data.rain?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
              {data.rain ? freshnessLabel(data.rain) : "unavailable"}
            </span>
          </div>
          {data.rain ? (
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-narrow font-bold text-3xl text-sky-400">{data.rain.month.toFixed(0)}</span>
                <span className="font-narrow text-sm text-galv-dim">mm / 30d</span>
              </div>
              {data.rain.history.length > 7 && (
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={data.rain.history.slice(-14)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                      {data.rain.history.slice(-14).map((d, i) => (
                        <Cell key={i} fill={d.date === todayKey ? "#38bdf8" : d.total > 0 ? "#0c4a6e" : "#1e293b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : <p className="text-galv-dim text-sm">Rainfall unavailable</p>}
        </div>

        {/* Visits */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-iron" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Visits</h2>
          </div>
          {data.visits.length > 0 ? (
            <div className="space-y-1">
              {data.visits.slice(0, 3).map((v, i) => (
                <div key={i} className="text-sm">
                  <span className="text-paper font-narrow">{v.visitorName}</span>
                  <span className="text-galv-dim text-xs ml-2">
                    {new Date(v.startDate).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      timeZone: "Australia/Sydney",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-galv-dim text-sm">No visits planned</p>}
        </div>

        {/* Restock */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-iron" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Restock</h2>
          </div>
          <div className="font-narrow font-bold text-3xl text-iron">
            {data.restockCount}
          </div>
          <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">items needed</div>
        </div>
      </div>
    </div>
  );
}
