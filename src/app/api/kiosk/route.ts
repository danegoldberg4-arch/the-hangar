import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateStatus } from "@/lib/maintenance";
import { fetchCurrentWeather, fetchForecast, fetchSunTimes } from "@/lib/integrations/forecast";
import { getLatestFireDanger } from "@/lib/integrations/weather";
import { getLatestPower, fetchPowerData } from "@/lib/integrations/selectlive";
import { getRainSummary } from "@/lib/integrations/rain";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [
    maintenanceItems,
    restockCount,
    visits,
    existingPower,
    fireDanger,
    weather,
    forecast,
    sunTimes,
    rain,
    powerHistory,
  ] = await Promise.all([
    prisma.maintenanceItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.restockItem.count({ where: { isResolved: false } }),
    prisma.visit.findMany({ where: { endDate: { gte: now } }, orderBy: { startDate: "asc" }, take: 5 }),
    getLatestPower(),
    getLatestFireDanger(),
    fetchCurrentWeather(),
    fetchForecast(),
    fetchSunTimes(),
    getRainSummary(),
    (async () => {
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const readings = await prisma.powerReading.findMany({
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
      });
      return readings.map((r) => ({
        time: r.recordedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
        batterySoc: r.batterySoc,
        solarW: Math.round(r.solarW),
        loadW: Math.round(r.loadW),
      }));
    })(),
  ]);

  const powerStale = !existingPower || (now.getTime() - existingPower.timestamp * 1000) / 60000 > 15;
  const power = powerStale ? await fetchPowerData() : existingPower;

  const alerts = maintenanceItems
    .map((item) => {
      const { status, daysUntilDue } = calculateStatus(item.intervalDays, item.lastCompletedAt, item.nextDueAt);
      return { name: item.name, status, daysOverdue: daysUntilDue ?? 0 };
    })
    .filter((a) => a.status === "overdue");

  return NextResponse.json({
    power: power ? {
      batterySoc: power.batterySoc,
      solarW: power.solarW,
      loadW: power.loadW,
      genRunning: power.genRunning,
      gridW: power.gridW,
      stale: power.stale,
    } : null,
    weather: weather ? {
      temp: weather.temp,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      windDir: weather.windDir,
      precipitation: weather.precipitation,
      weatherCode: weather.weatherCode,
    } : null,
    forecast: forecast ? {
      daily: forecast.daily.map((d) => ({
        date: d.date,
        maxTemp: d.maxTemp,
        minTemp: d.minTemp,
        precipitation: d.precipitation,
        weatherCode: d.weatherCode,
      })),
    } : null,
    fireDanger: fireDanger ? {
      dangerToday: fireDanger.dangerToday,
      dangerTomorrow: fireDanger.dangerTomorrow,
      fireBanToday: fireDanger.fireBanToday,
    } : null,
    rain: rain ? {
      today: rain.today,
      week: rain.week,
      month: rain.month,
      history: rain.dailyHistory,
    } : null,
    sunTimes: sunTimes ? {
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
    } : null,
    powerHistory,
    alerts: alerts.map((a) => ({ name: a.name, daysOverdue: a.daysOverdue })),
    restockCount,
    visits: visits.map((v) => ({
      visitorName: v.visitorName,
      startDate: v.startDate.toISOString(),
      endDate: v.endDate.toISOString(),
    })),
  });
}
