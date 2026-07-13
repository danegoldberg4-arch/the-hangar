import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  calculateStatus,
} from "@/lib/maintenance";
import { MonitoringPanel } from "@/components/monitoring/monitoring-panel";
import { RestockSummary } from "@/components/restock/restock-summary";
import { RainWidget } from "@/components/weather/rain-widget";
import { ForecastWidget } from "@/components/weather/forecast-widget";
import { PowerHistoryChart } from "@/components/weather/power-history-chart";
import { VisitSummary } from "@/components/visits/visit-summary";
import { PlugSummary } from "@/components/plugs/plug-summary";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const items = await prisma.maintenanceItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const itemsWithStatus = items.map((item) => {
    const { status, daysUntilDue } = calculateStatus(
      item.intervalDays,
      item.lastCompletedAt,
      item.nextDueAt
    );
    return { ...item, status, daysUntilDue };
  });

  const overdue = itemsWithStatus.filter((i) => i.status === "overdue");
  const dueSoon = itemsWithStatus.filter((i) => i.status === "due_soon");
  const noHistory = itemsWithStatus.filter((i) => i.status === "no_history");

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 w-full overflow-x-hidden py-8">
      {/* Hero */}
      <div className="mb-10">
        <span className="eyebrow">Upper Kangaroo River · NSW</span>
        <h1 className="font-narrow font-bold uppercase text-3xl sm:text-5xl tracking-tight mt-2 text-paper">
          The Hangar
        </h1>
        <p className="lead text-lg text-galv mt-2 max-w-xl">
          Off-grid by design. Here&apos;s how it&apos;s running.
        </p>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="mb-6 space-y-2">
          {overdue.map((item) => (
            <Link
              key={item.id}
              href={`/maintenance/${item.id}`}
              className="card-surface block p-4 hover:border-iron/30 transition-colors group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-iron animate-pulse" />
                  <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper group-hover:text-iron-lt transition-colors">
                    {item.name}
                  </h3>
                </div>
                <span className="font-narrow uppercase tracking-wider text-xs font-bold text-iron">
                  {item.daysUntilDue !== null
                    ? `${Math.abs(item.daysUntilDue)}d overdue`
                    : "Overdue"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Live Monitoring */}
      <div className="mb-8">
        <h2 className="font-narrow uppercase tracking-[0.15em] text-sm font-bold text-galv-dim mb-4">
          Live Monitoring
        </h2>
        <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading monitoring data...</div>}>
          <MonitoringPanel />
        </Suspense>

        <div className="mt-3">
          <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading power history...</div>}>
            <PowerHistoryChart />
          </Suspense>
        </div>
      </div>

      {/* Maintenance + Restock + Visits grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Maintenance Summary */}
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper">
              Maintenance
            </h3>
            <Link
              href="/maintenance"
              className="font-narrow uppercase tracking-wider text-xs text-iron hover:text-iron-lt transition-colors"
            >
              View →
            </Link>
          </div>
          <div className="space-y-2.5">
            <SummaryRow label="Overdue" count={overdue.length} color="text-iron" />
            <SummaryRow label="Due Soon" count={dueSoon.length} color="text-iron-lt" />
            <SummaryRow label="Not Started" count={noHistory.length} color="text-galv" />
            <div className="h-px bg-line my-2" />
            <SummaryRow label="Total" count={items.length} color="text-paper" />
          </div>
        </div>

        {/* Restock Summary */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading...</div>}>
            <RestockSummary />
          </Suspense>
        </div>
      </div>

      {/* Plugs (only shows if plugs exist) */}
      <div className="mb-8">
        <Suspense fallback={null}>
          <PlugSummary />
        </Suspense>
      </div>

      {/* Visits + Rain + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading...</div>}>
            <VisitSummary />
          </Suspense>
        </div>
        <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading...</div>}>
          <RainWidget />
        </Suspense>
        <Suspense fallback={<div className="card-surface p-4 sm:p-5 text-sm text-galv-dim">Loading...</div>}>
          <ForecastWidget />
        </Suspense>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-line rounded-xl overflow-hidden border border-line mb-8">
        <Stat n="15" unit="kW" label="Solar" />
        <Stat n="26.1" unit="kWh" label="Battery" />
        <Stat n="7.5" unit="kW" label="Inverter" />
        <Stat n="22k" unit="L" label="Water" />
        <Stat n="4×45" unit="kg" label="LPG" />
      </div>

      {/* Footer */}
      <div className="border-t border-line pt-6">
        <p className="text-xs text-galv-dim">
          <span className="font-narrow uppercase tracking-wider text-galv">The Hangar</span> · Protohouse No. V · 38E Scotts Rd · Upper Kangaroo River NSW 2577
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-narrow uppercase tracking-wider text-xs text-galv-dim">{label}</span>
      <span className={`font-narrow font-bold text-lg ${color}`}>{count}</span>
    </div>
  );
}

function Stat({ n, unit, label }: { n: string; unit: string; label: string }) {
  return (
    <div className="bg-steel-2 p-4">
      <div className="font-narrow font-bold text-xl text-paper">
        {n}<span className="text-xs text-galv-dim ml-0.5">{unit}</span>
      </div>
      <div className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim mt-0.5">
        {label}
      </div>
    </div>
  );
}
