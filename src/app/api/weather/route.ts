import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchWeatherObservation, fetchWeatherWarnings, getLatestWeather } from "@/lib/integrations/weather";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const [fresh, warnings] = await Promise.all([
    fetchWeatherObservation(),
    fetchWeatherWarnings(),
  ]);

  const weather = fresh || (await getLatestWeather());

  if (!weather) {
    return NextResponse.json({ error: "No weather data available" }, { status: 404 });
  }

  return NextResponse.json({
    current: weather,
    warnings,
    fetchedAt: new Date().toISOString(),
  });
}
