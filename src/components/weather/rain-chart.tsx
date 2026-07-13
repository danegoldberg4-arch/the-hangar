"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { freshnessLabel, type ObservationMeta } from "@/lib/integrations/freshness";

interface RainData {
  date: string;
  total: number;
}

interface RainWidgetProps extends ObservationMeta {
  today: number;
  week: number;
  month: number;
  history: RainData[];
}

type Range = "today" | "week" | "month";

export function RainChart({ today, week, month, history, freshness, observedAt, ageSeconds }: RainWidgetProps) {
  const [range, setRange] = useState<Range>("week");

  const todayKey = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Australia/Sydney",
  });

  const data = (() => {
    if (range === "today") return history.slice(-1);
    if (range === "week") return history.slice(-7);
    return history.slice(-30);
  })();

  const total = range === "today" ? today : range === "week" ? week : month;

  const formatXAxis = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      timeZone: "Australia/Sydney",
    });
  };

  const rangeConfig: Record<Range, { label: string; count: number }> = {
    today: { label: "Today", count: 1 },
    week: { label: "7 Days", count: 7 },
    month: { label: "30 Days", count: 30 },
  };

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Rainfall</h3>
        </div>
        <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
          {freshnessLabel({ freshness, observedAt, ageSeconds })}
        </span>
      </div>

      {/* Total + range buttons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-1">
          <span className="font-narrow font-bold text-3xl text-sky-400">{total.toFixed(1)}</span>
          <span className="font-narrow text-sm text-galv-dim">mm</span>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-2">
            {rangeConfig[range].label}
          </span>
        </div>
        <div className="flex gap-1">
          {(Object.keys(rangeConfig) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`font-narrow uppercase tracking-wider text-[0.6rem] font-bold px-2.5 py-1 rounded-md transition-colors ${
                range === r
                  ? "bg-sky-400 text-steel"
                  : "text-galv-dim border border-line hover:bg-steel-3"
              }`}
            >
              {r === "today" ? "1D" : r === "week" ? "7D" : "30D"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fill: "#646b75", fontSize: 9, fontFamily: "Archivo Narrow" }}
              tickLine={false}
              axisLine={false}
              interval={range === "month" ? 5 : range === "week" ? 1 : 0}
            />
            <YAxis
              tick={{ fill: "#646b75", fontSize: 9, fontFamily: "Archivo Narrow" }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "#16191e",
                border: "1px solid rgba(154,161,171,0.12)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "Archivo Narrow",
              }}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Australia/Sydney",
                })
              }
              labelStyle={{ color: "#9aa1ab" }}
              itemStyle={{ color: "#f3efe7" }}
              formatter={(value: unknown) => [`${Number(value).toFixed(1)}mm`, "Rain"]}
            />
            <Bar dataKey="total" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.date === todayKey ? "#38bdf8" : d.total > 0 ? "#0c4a6e" : "#1e293b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[120px] flex items-center justify-center">
          <p className="text-xs text-galv-dim">No data</p>
        </div>
      )}
    </div>
  );
}
