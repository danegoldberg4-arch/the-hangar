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

interface KioskData {
  power: {
    batterySoc: number;
    solarW: number;
    loadW: number;
    genRunning: boolean;
    gridW: number;
    stale: boolean;
  } | null;
  weather: {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: number;
    precipitation: number;
    weatherCode: number;
  } | null;
  forecast: {
    daily: { date: string; maxTemp: number; minTemp: number; precipitation: number; weatherCode: number }[];
  } | null;
  fireDanger: {
    dangerToday: string;
    dangerTomorrow: string;
    fireBanToday: boolean;
  } | null;
  rain: {
    today: number;
    week: number;
    month: number;
    history: { date: string; total: number }[];
  } | null;
  sunTimes: { sunrise: string; sunset: string } | null;
  powerHistory: { time: string; batterySoc: number; solarW: number; loadW: number }[];
  alerts: { name: string; daysOverdue: number }[];
  restockCount: number;
  visits: { visitorName: string; startDate: string; endDate: string }[];
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

// Kiosk metadata — set via layout

export default function KioskPage() {
  const [data, setData] = useState<KioskData | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/kiosk");
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error("kiosk load error", e);
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

  if (!data) {
    return (
      <div className="min-h-screen bg-steel flex items-center justify-center">
        <div className="text-center">
          <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-iron fill-none mx-auto mb-4 animate-pulse" strokeWidth={1.5}>
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <p className="font-narrow uppercase tracking-wider text-sm text-galv-dim">Loading...</p>
        </div>
      </div>
    );
  }

  const fdr = data.fireDanger ? fireDangerConfig[data.fireDanger.dangerToday] : null;
  const todayKey = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="min-h-screen bg-steel text-paper p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-iron fill-none" strokeWidth={1.5}>
            <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
          </svg>
          <div>
            <h1 className="font-narrow font-bold uppercase text-xl tracking-tight text-paper">The Hangar</h1>
            <p className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">Upper Kangaroo River · NSW</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-narrow font-bold text-3xl text-paper">
            {time.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim">
            {time.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Alerts banner */}
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
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Power — big card */}
        <div className="card-surface p-5 fade-in col-span-2 row-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-amber-400 ${data.power && !data.power.stale ? "glow-dot text-amber-400" : ""}`} />
              <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Power</h2>
            </div>
            <span className={`font-narrow uppercase tracking-wider text-xs ${data.power?.stale ? "text-galv-dim" : "text-green-400"}`}>
              {data.power ? (data.power.stale ? "stale" : "live") : "—"}
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
                  <div className={`font-narrow font-bold text-2xl ${data.power.genRunning ? "text-amber-400" : "text-galv-dim"}`}>
                    {data.power.genRunning ? "Running" : "Standby"}
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
            <p className="text-galv-dim">Connect select.live</p>
          )}
        </div>

        {/* Weather */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-sky-400 glow-dot text-sky-400" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Weather</h2>
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
          ) : <p className="text-galv-dim text-sm">Loading...</p>}
        </div>

        {/* Fire Danger */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 glow-dot text-red-500" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Fire Danger</h2>
          </div>
          {fdr && data.fireDanger ? (
            <div>
              <div className={`font-narrow font-bold text-3xl ${fdr.color} mb-1`}>
                {fdr.label}
              </div>
              <div className="font-narrow uppercase tracking-wider text-xs text-galv-dim mb-3">Today</div>
              <div className="flex justify-between text-sm">
                <span className="text-galv-dim">Tomorrow</span>
                <span className={`font-bold ${fireDangerConfig[data.fireDanger.dangerTomorrow]?.color || "text-galv"}`}>
                  {fireDangerConfig[data.fireDanger.dangerTomorrow]?.label || data.fireDanger.dangerTomorrow}
                </span>
              </div>
              {data.fireDanger.fireBanToday && (
                <div className="mt-2 text-red-400 font-narrow uppercase tracking-wider text-xs">
                  Total Fire Ban
                </div>
              )}
            </div>
          ) : <p className="text-galv-dim text-sm">Loading...</p>}
        </div>

        {/* Sunrise/Sunset */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 glow-dot text-amber-400" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Sun</h2>
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
          ) : <p className="text-galv-dim text-sm">Loading...</p>}
        </div>

        {/* Forecast */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Forecast</h2>
          </div>
          {data.forecast ? (
            <div className="grid grid-cols-5 gap-2">
              {data.forecast.daily.map((day, i) => {
                const d = new Date(day.date);
                return (
                  <div key={day.date} className="text-center">
                    <div className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
                      {i === 0 ? "Today" : dayNames[d.getDay()]}
                    </div>
                    <div className="font-narrow font-bold text-lg text-paper mt-1">{day.maxTemp.toFixed(0)}°</div>
                    <div className="font-narrow text-xs text-galv-dim">{day.minTemp.toFixed(0)}°</div>
                    {day.precipitation > 0 && <div className="font-narrow text-[0.6rem] text-sky-400">{day.precipitation}mm</div>}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-galv-dim text-sm">Loading...</p>}
        </div>

        {/* Rainfall */}
        <div className="card-surface p-5 fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv">Rainfall</h2>
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
          ) : <p className="text-galv-dim text-sm">Loading...</p>}
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
                    {new Date(v.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
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
