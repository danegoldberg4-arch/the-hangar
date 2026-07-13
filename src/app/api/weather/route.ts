import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchWeatherObservation, fetchWeatherWarnings, getLatestWeather } from "@/lib/integrations/weather";
import { unavailableMeta } from "@/lib/integrations/freshness";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const [fresh, warnings] = await Promise.all([
    fetchWeatherObservation(),
    fetchWeatherWarnings(),
  ]);

  const weather = fresh ?? (await getLatestWeather());

  if (!weather) {
    return NextResponse.json(
      { error: "No weather observation is available", ...unavailableMeta(), refreshSucceeded: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    current: weather,
    warnings: warnings ?? [],
    warningsAvailable: warnings !== null,
    refreshSucceeded: fresh !== null,
    fetchedAt: new Date().toISOString(),
  });
}
