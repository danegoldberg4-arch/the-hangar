import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateOnlyInTimeZone } from "@/lib/workflow-validation";

export async function VisitSummary() {
  const today = dateOnlyInTimeZone();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const todayEnd = new Date(tomorrow.getTime() - 1);

  const upcoming = await prisma.visit.findMany({
    where: { endDate: { gte: today } },
    orderBy: { startDate: "asc" },
    take: 3,
  });

  const atHouse = await prisma.visit.findMany({
    where: {
      startDate: { lte: todayEnd },
      endDate: { gte: today },
    },
  });

  return (
    <div className="card-surface p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper">
          Visits
        </h3>
        <Link
          href="/visits"
          className="font-narrow uppercase tracking-wider text-xs text-iron hover:text-iron-lt transition-colors"
        >
          Calendar →
        </Link>
      </div>

      {atHouse.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-narrow uppercase tracking-wider text-xs text-green-400">
            At the house now
          </span>
        </div>
      )}

      {upcoming.length === 0 ? (
        <p className="text-xs text-galv-dim">No visits planned.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((v) => {
            const isNow = new Date(v.startDate) <= todayEnd && new Date(v.endDate) >= today;
            const daysUntil = Math.round(
              (new Date(v.startDate).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return (
              <div key={v.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${isNow ? "bg-green-400" : "bg-iron/40"}`} />
                  <span className="font-narrow text-sm text-paper truncate">{v.visitorName}</span>
                </div>
                <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim whitespace-nowrap ml-2">
                  {isNow
                    ? "here now"
                    : daysUntil === 1
                    ? "tomorrow"
                    : daysUntil === 0
                    ? "today"
                    : `${daysUntil}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
