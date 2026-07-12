import { prisma } from "@/lib/prisma";
import { PowerChart } from "@/components/weather/power-chart";

export async function PowerHistoryChart() {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const readings = await prisma.powerReading.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
  });

  const data = readings.map((r) => ({
    time: r.recordedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    batterySoc: r.batterySoc,
    solarW: Math.round(r.solarW),
    loadW: Math.round(r.loadW),
    batteryW: Math.round(r.batteryW),
  }));

  return <PowerChart data={data} />;
}
