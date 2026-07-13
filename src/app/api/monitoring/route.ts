import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { fetchPowerData, getLatestPower } from "@/lib/integrations/selectlive";
import { fetchCurrentWeather, fetchSunTimes } from "@/lib/integrations/forecast";
import { getLatestFireDanger, fetchWeatherWarnings } from "@/lib/integrations/weather";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const [existingPower, fireDanger, weather, sunTimes, warnings, starlink] = await Promise.all([
    getLatestPower(),
    getLatestFireDanger(),
    fetchCurrentWeather(),
    fetchSunTimes(),
    fetchWeatherWarnings(),
    prisma.starlinkStatus.findFirst({ orderBy: { observedAt: "desc" } }),
  ]);

  const powerStale = !existingPower || (existingPower.observedAt ? new Date(existingPower.observedAt) < fifteenMinAgo : true);
  const freshPower = powerStale ? await fetchPowerData() : null;
  const power = freshPower || existingPower;

  return NextResponse.json({
    power: power ? {
      batterySoc: power.batterySoc,
      solarW: power.solarW,
      loadW: power.loadW,
      gridW: power.gridW,
      genRunning: power.genRunning,
      genStatus: power.genStatus,
      freshness: power.freshness,
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
