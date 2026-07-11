import { NextResponse, type NextRequest } from "next/server";
import { fetchWeatherObservation, fetchFireDanger } from "@/lib/integrations/weather";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [weather, fire] = await Promise.all([
    fetchWeatherObservation(),
    fetchFireDanger(),
  ]);

  return NextResponse.json({
    ok: true,
    weather: weather ? `${weather.airTemp}°C at ${weather.station}` : "failed",
    fireDanger: fire ? fire.dangerToday : "failed",
    fetchedAt: new Date().toISOString(),
  });
}
