import { NextResponse, type NextRequest } from "next/server";
import { fetchWeatherObservation, fetchFireDanger } from "@/lib/integrations/weather";
import { fetchPowerData } from "@/lib/integrations/selectlive";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [weather, fire, power] = await Promise.all([
    fetchWeatherObservation(),
    fetchFireDanger(),
    fetchPowerData(),
  ]);

  return NextResponse.json({
    ok: true,
    weather: weather ? `${weather.airTemp}°C` : "failed",
    fireDanger: fire ? fire.dangerToday : "failed",
    power: power ? `Battery ${power.batterySoc.toFixed(0)}% | Solar ${power.solarW.toFixed(0)}W | Load ${power.loadW.toFixed(0)}W` : "failed",
    fetchedAt: new Date().toISOString(),
  });
}
