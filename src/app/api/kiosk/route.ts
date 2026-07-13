import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { calculateStatus } from "@/lib/maintenance";
import { fetchCurrentWeather, fetchForecast, fetchSunTimes } from "@/lib/integrations/forecast";
import { getLatestFireDanger } from "@/lib/integrations/weather";
import { getLatestPower } from "@/lib/integrations/selectlive";
import { getRainSummary } from "@/lib/integrations/rain";
import { unavailableMeta, type ObservationMeta } from "@/lib/integrations/freshness";
import { startOfDayInTimeZone } from "@/lib/time";

export const maxDuration = 30;

function sourceMeta(source: ObservationMeta | null) {
  return source
    ? {
        freshness: source.freshness,
        observedAt: source.observedAt,
        ageSeconds: source.ageSeconds,
      }
    : unavailableMeta();
}

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const now = new Date();
  const startOfSydneyToday = startOfDayInTimeZone(now, "Australia/Sydney");
  const [
    maintenanceItems,
    restockCount,
    visits,
    power,
    fireDanger,
    weather,
    forecast,
    sunTimes,
    rain,
    powerReadings,
  ] = await Promise.all([
    prisma.maintenanceItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.restockItem.count({ where: { isResolved: false } }),
    prisma.visit.findMany({
      where: { endDate: { gte: startOfSydneyToday } },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    getLatestPower(),
    getLatestFireDanger(),
    fetchCurrentWeather(),
    fetchForecast(),
    fetchSunTimes(),
    getRainSummary(),
    prisma.powerReading.findMany({
      where: {
        observedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        sourceTimestampTrusted: true,
      },
      orderBy: { observedAt: "asc" },
    }),
  ]);

  const alerts = maintenanceItems
    .map((item) => {
      const { status, daysUntilDue } = calculateStatus(
        item.intervalDays,
        item.lastCompletedAt,
        item.nextDueAt
      );
      return { name: item.name, status, daysOverdue: daysUntilDue ?? 0 };
    })
    .filter((alert) => alert.status === "overdue");

  return NextResponse.json({
    sources: {
      power: sourceMeta(power),
      weather: sourceMeta(weather),
      forecast: sourceMeta(forecast),
      fireDanger: sourceMeta(fireDanger),
      rain: sourceMeta(rain),
      sunTimes: sourceMeta(sunTimes),
    },
    power: power
      ? {
          batterySoc: power.batterySoc,
          solarW: power.solarW,
          loadW: power.loadW,
          genRunning: power.genRunning,
          gridW: power.gridW,
          freshness: power.freshness,
          observedAt: power.observedAt,
          ageSeconds: power.ageSeconds,
        }
      : null,
    weather,
    forecast: forecast
      ? {
          daily: forecast.daily.map((day) => ({
            date: day.date,
            maxTemp: day.maxTemp,
            minTemp: day.minTemp,
            precipitation: day.precipitation,
            weatherCode: day.weatherCode,
          })),
          freshness: forecast.freshness,
          observedAt: forecast.observedAt,
          ageSeconds: forecast.ageSeconds,
        }
      : null,
    fireDanger: fireDanger
      ? {
          dangerToday: fireDanger.dangerToday,
          dangerTomorrow: fireDanger.dangerTomorrow,
          fireBanToday: fireDanger.fireBanToday,
          reportDate: fireDanger.reportDate,
          freshness: fireDanger.freshness,
          observedAt: fireDanger.observedAt,
          ageSeconds: fireDanger.ageSeconds,
        }
      : null,
    rain: rain
      ? {
          today: rain.today,
          week: rain.week,
          month: rain.month,
          history: rain.dailyHistory,
          freshness: rain.freshness,
          observedAt: rain.observedAt,
          ageSeconds: rain.ageSeconds,
        }
      : null,
    sunTimes,
    powerHistory: powerReadings.map((reading) => ({
      time: reading.observedAt.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Australia/Sydney",
      }),
      batterySoc: reading.batterySoc,
      solarW: Math.round(reading.solarW),
      loadW: Math.round(reading.loadW),
    })),
    alerts: alerts.map((alert) => ({ name: alert.name, daysOverdue: alert.daysOverdue })),
    restockCount,
    visits: visits.map((visit) => ({
      visitorName: visit.visitorName,
      startDate: visit.startDate.toISOString(),
      endDate: visit.endDate.toISOString(),
    })),
    generatedAt: now.toISOString(),
  });
}
