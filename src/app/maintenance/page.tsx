import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  calculateStatus,
  statusConfig,
  categoryConfig,
  type MaintenanceStatus,
} from "@/lib/maintenance";

export default async function MaintenancePage() {
  const items = await prisma.maintenanceItem.findMany({
    where: { isActive: true },
    include: {
      logs: {
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
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

  itemsWithStatus.sort((a, b) => {
    const order: Record<MaintenanceStatus, number> = {
      overdue: 0,
      due_soon: 1,
      no_history: 2,
      as_needed: 3,
      upcoming: 4,
    };
    return order[a.status] - order[b.status];
  });

  const byCategory = itemsWithStatus.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof itemsWithStatus>
  );

  const categoryOrder = [
    "water",
    "power",
    "generator",
    "gas",
    "wastewater",
    "pool",
    "internet",
    "grounds",
    "general",
  ];

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 w-full overflow-x-hidden py-8 sm:py-12">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <span className="eyebrow">The logbook</span>
          <h1 className="font-narrow font-bold uppercase text-3xl sm:text-4xl tracking-tight mt-1 text-paper">
            Maintenance Schedule
          </h1>
        </div>
        <Link
          href="/maintenance/new"
          className="font-narrow uppercase tracking-wider text-xs font-bold text-steel bg-sand px-4 py-2 rounded-md hover:bg-paper transition-colors"
        >
          + Add Item
        </Link>
      </div>

      <p className="lead text-galv-dim max-w-2xl mb-8">
        What to check and replace, and when. A hangar keeps a logbook.
      </p>

      {categoryOrder.map((cat) => {
        const catItems = byCategory[cat];
        if (!catItems || catItems.length === 0) return null;
        const config = categoryConfig[cat] || categoryConfig.general;

        return (
          <div key={cat} className="mb-8">
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-iron mb-3">
              {config.label}
            </h2>
            <div className="space-y-2">
              {catItems.map((item) => {
                const s = statusConfig[item.status];
                return (
                  <Link
                    key={item.id}
                    href={`/maintenance/${item.id}`}
                    className={`block border ${s.borderColor} ${s.bgColor} rounded-xl p-4 hover:border-galv transition-colors group`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper group-hover:text-iron-lt transition-colors">
                            {item.name}
                          </h3>
                          <span className={`font-narrow uppercase tracking-wider text-[0.6rem] font-bold ${s.color}`}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-sm text-galv-dim truncate">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-galv-dim font-narrow tracking-wide">
                          <span>{item.intervalLabel}</span>
                          {item.assignedTo && <span>· {item.assignedTo}</span>}
                          {item.lastCompletedAt && (
                            <span>
                              · Last: {new Date(item.lastCompletedAt).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        {item.daysUntilDue !== null && (
                          <div className={`font-narrow font-bold text-lg ${s.color}`}>
                            {item.daysUntilDue < 0
                              ? `${Math.abs(item.daysUntilDue)}d`
                              : `${item.daysUntilDue}d`}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
