import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchWeatherObservation, fetchWeatherWarnings, getLatestWeather } from "@/lib/integrations/weather";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
