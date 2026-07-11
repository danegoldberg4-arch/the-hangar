import { prisma } from "@/lib/prisma";

export interface RainSummary {
  today: number;
  week: number;
  month: number;
  dailyHistory: { date: string; total: number }[];
}

export async function getRainSummary(): Promise<RainSummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 31);

  const readings = await prisma.weatherData.findMany({
    where: {
      recordedAt: { gte: thirtyDaysAgo },
    },
    select: {
      rainTrace: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: "asc" },
  });

  const dailyTotals = new Map<string, number>();

  for (const r of readings) {
    const dateKey = r.recordedAt.toISOString().slice(0, 10);
    const rainVal = parseFloat(r.rainTrace || "0") || 0;
    const current = dailyTotals.get(dateKey) ?? 0;
    dailyTotals.set(dateKey, Math.max(current, rainVal));
  }

  const todayKey = now.toISOString().slice(0, 10);
  const today = dailyTotals.get(todayKey) ?? 0;

  let week = 0;
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  for (const [dateKey, total] of dailyTotals) {
    if (new Date(dateKey) >= weekAgo) {
      week += total;
    }
  }

  let month = 0;
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);
  for (const [dateKey, total] of dailyTotals) {
    if (new Date(dateKey) >= monthAgo) {
      month += total;
    }
  }

  const dailyHistory = Array.from(dailyTotals.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return { today, week, month, dailyHistory };
}
