"use client";

import { useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Reading {
  time: string;
  batterySoc: number;
  solarW: number;
  loadW: number;
  batteryW: number;
}

type Range = "1h" | "6h" | "24h";

const rangeHours: Record<Range, number> = { "1h": 1, "6h": 6, "24h": 24 };

export function PowerChart({ initialData }: { initialData: Reading[] }) {
  const [range, setRange] = useState<Range>("24h");
  const [data, setData] = useState<Reading[]>(initialData);
  const [loading, setLoading] = useState(false);

  const switchRange = useCallback(async (r: Range) => {
    setRange(r);
    if (r === "24h" && initialData.length > 0) {
      // 24h uses server-rendered initial data
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/power?hours=${rangeHours[r]}`);
      if (res.ok) {
        const json = await res.json();
        if (json.history) {
          setData(json.history);
        }
      }
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, [initialData]);

  if (data.length < 2) {
    return (
      <div className="card-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power History</h3>
        </div>
        <p className="text-xs text-galv-dim leading-relaxed">
          Collecting data — the 15-minute poll needs at least two samples. Check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power History</h3>
        </div>
        <div className="flex gap-1">
          {(["1h", "6h", "24h"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRange(r)}
              className={`font-narrow uppercase tracking-wider text-[0.6rem] font-bold px-2.5 py-1 rounded-md transition-colors ${
                range === r
                  ? "bg-amber-400 text-steel"
                  : "text-galv-dim border border-line hover:bg-steel-3"
              }`}
            >
              {r === "1h" ? "1H" : r === "6h" ? "6H" : "24H"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: -10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,161,171,0.08)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#646b75", fontSize: 10, fontFamily: "Archivo Narrow" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={range === "1h" ? 10 : range === "6h" ? 30 : 40}
          />
          <YAxis
            yAxisId="watts"
            tick={{ fill: "#646b75", fontSize: 10, fontFamily: "Archivo Narrow" }}
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
          />
          <YAxis
            yAxisId="battery"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: "#646b75", fontSize: 10, fontFamily: "Archivo Narrow" }}
            tickLine={false}
            axisLine={false}
            width={35}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#16191e",
              border: "1px solid rgba(154,161,171,0.12)",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "Archivo Narrow",
            }}
            labelStyle={{ color: "#9aa1ab" }}
            itemStyle={{ color: "#f3efe7" }}
          />
          <Area
            type="monotone"
            dataKey="solarW"
            name="Solar"
            stroke="#f59e0b"
            strokeWidth={1.5}
            fill="url(#solarGrad)"
            yAxisId="watts"
          />
          <Area
            type="monotone"
            dataKey="loadW"
            name="Load"
            stroke="#38bdf8"
            strokeWidth={1.5}
            fill="url(#loadGrad)"
            yAxisId="watts"
          />
          <Line
            type="monotone"
            dataKey="batterySoc"
            name="Battery %"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            yAxisId="battery"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
          {loading ? "Loading..." : `${data.length} readings · ${range}`}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Solar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Battery %</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Load</span>
          </span>
        </div>
      </div>
    </div>
  );
}
