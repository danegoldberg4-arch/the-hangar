import { NextResponse, type NextRequest } from "next/server";
import { fetchPowerData } from "@/lib/integrations/selectlive";
import { hasValidBearerToken } from "@/lib/bearer-auth";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!hasValidBearerToken(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const power = await fetchPowerData();
    return NextResponse.json({
      ok: !!power,
      batterySoc: power?.batterySoc.toFixed(0) ?? null,
      solarW: power?.solarW.toFixed(0) ?? null,
      loadW: power?.loadW.toFixed(0) ?? null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:power] error:", error);
    return NextResponse.json({ ok: false, error: "fetch failed" }, { status: 502 });
  }
}
