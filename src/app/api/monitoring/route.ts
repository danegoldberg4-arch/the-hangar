import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestPower, fetchPowerData } from "@/lib/integrations/selectlive";
import { fetchCurrentWeather, fetchSunTimes } from "@/lib/integrations/forecast";
import { getLatestFireDanger, fetchWeatherWarnings } from "@/lib/integrations/weather";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

  let existingPower = null;
  let fireDanger = null;
  let starlink = null;

  try {
    [existingPower, fireDanger, starlink] = await Promise.all([
      getLatestPower(),
      getLatestFireDanger(),
      prisma.starlinkStatus.findFirst({ orderBy: { observedAt: "desc" } }),
    ]);
  } catch {
    // DB might be cold-starting on Neon free tier
  }

  const powerStale = !existingPower || (existingPower.observedAt ? new Date(existingPower.observedAt) < fifteenMinAgo : true);

  const [power, weather, sunTimes, warnings] = await Promise.all([
    powerStale ? fetchPowerData().catch(() => null) : Promise.resolve(existingPower),
    fetchCurrentWeather().catch(() => null),
    fetchSunTimes().catch(() => null),
    fetchWeatherWarnings().catch(() => []),
  ]);

  return NextResponse.json({
    power: power ? {
      batterySoc: power.batterySoc,
      solarW: power.solarW,
      loadW: power.loadW,
      gridW: power.gridW,
      genRunning: power.genRunning,
      genStatus: power.genStatus,
      freshness: String(power.freshness || "live"),
    } : null,
    weather: weather ? {
      temp: weather.temp,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      windDir: weather.windDir,
      precipitation: weather.precipitation,
      weatherCode: weather.weatherCode,
    } : null,
    sunTimes: sunTimes ? {
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
    } : null,
    fireDanger: fireDanger ? {
      dangerToday: fireDanger.dangerToday,
      dangerTomorrow: fireDanger.dangerTomorrow,
      fireBanToday: fireDanger.fireBanToday,
    } : null,
    warnings: (warnings || []).map((w) => ({ title: w.title, link: w.link })),
    starlink: starlink ? {
      connected: starlink.connected,
      latencyMs: starlink.latencyMs,
      downlinkThroughputBps: starlink.downlinkThroughputBps,
    } : null,
  });
}
