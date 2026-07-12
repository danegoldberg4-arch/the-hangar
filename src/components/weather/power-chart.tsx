"use client";

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

export function PowerChart({ data }: { data: Reading[] }) {
  if (data.length < 2) {
    return (
      <div className="card-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power History</h3>
        </div>
        <p className="text-xs text-galv-dim leading-relaxed">
          Collecting data — check back after the family has been using the app for a day. Each dashboard visit logs a reading.
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
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Solar</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Battery</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Load</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: "#646b75", fontSize: 10, fontFamily: "Archivo Narrow" }}
            tickLine={false}
            axisLine={false}
            width={40}
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
          />
          <Area
            type="monotone"
            dataKey="loadW"
            name="Load"
            stroke="#38bdf8"
            strokeWidth={1.5}
            fill="url(#loadGrad)"
          />
          <Line
            type="monotone"
            dataKey="batterySoc"
            name="Battery %"
            stroke="#4ade80"
            strokeWidth={1.5}
            dot={false}
            yAxisId={0}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
          {data.length} readings · last 24h
        </span>
        <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
          Updates on each visit
        </span>
      </div>
    </div>
  );
}
