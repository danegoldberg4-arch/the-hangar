import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchPowerData, getLatestPower, getPowerHistory } from "@/lib/integrations/selectlive";
import { unavailableMeta } from "@/lib/integrations/freshness";

export const maxDuration = 30;

export async function GET(request: Request) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const requestedHours = Number.parseInt(searchParams.get("hours") || "0", 10);
  const hours = Number.isFinite(requestedHours) ? Math.min(Math.max(requestedHours, 0), 720) : 0;

  if (hours > 0) {
    const history = await getPowerHistory(hours);
    const latest = history.at(-1);
    return NextResponse.json({
      history,
      freshness: latest?.freshness ?? "unavailable",
      observedAt: latest?.observedAt ?? null,
      ageSeconds: latest?.ageSeconds ?? null,
      fetchedAt: new Date().toISOString(),
    });
  }

  const fresh = await fetchPowerData();
  const power = fresh ?? (await getLatestPower());

  if (!power) {
    return NextResponse.json(
      { error: "No power observation is available", ...unavailableMeta(), refreshSucceeded: false },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ...power,
    refreshSucceeded: fresh !== null,
    fetchedAt: new Date().toISOString(),
  });
}
