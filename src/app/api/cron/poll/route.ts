import { NextResponse, type NextRequest } from "next/server";
import { fetchWeatherObservation, fetchFireDanger } from "@/lib/integrations/weather";
import { fetchPowerData } from "@/lib/integrations/selectlive";
import { hasValidBearerToken } from "@/lib/bearer-auth";
import { pruneTelemetry } from "@/lib/integrations/retention";
import type { ObservationMeta } from "@/lib/integrations/freshness";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!hasValidBearerToken(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [powerResult, weatherResult, fireDangerResult, retentionResult] =
    await Promise.allSettled([
      fetchPowerData(),
      fetchWeatherObservation(),
      fetchFireDanger(),
      pruneTelemetry(),
    ]);

  const sourceResult = (
    source: string,
    result: PromiseSettledResult<ObservationMeta | null>
  ) => {
    if (result.status === "rejected") {
      console.error(`[cron] ${source} collection rejected:`, result.reason);
      return {
        ok: false,
        observedAt: null,
        freshness: "unavailable" as const,
        reason: "collection_error",
      };
    }
    if (!result.value) {
      return {
        ok: false,
        observedAt: null,
        freshness: "unavailable" as const,
        reason: "no_observation",
      };
    }

    return {
      ok: result.value.freshness === "live",
      observedAt: result.value.observedAt,
      freshness: result.value.freshness,
      ...(result.value.freshness === "live" ? {} : { reason: "observation_not_live" }),
    };
  };

  if (retentionResult.status === "rejected") {
    console.error("[cron] Telemetry retention failed:", retentionResult.reason);
  }

  const sources = {
    power: sourceResult("power", powerResult),
    weather: sourceResult("weather", weatherResult),
    fireDanger: sourceResult("fireDanger", fireDangerResult),
  };
  const failures = Object.entries(sources).flatMap(([source, result]) =>
    result.ok ? [] : [{ source, reason: result.reason }]
  );
  if (retentionResult.status === "rejected") {
    failures.push({ source: "retention", reason: "retention_error" });
  }

  return NextResponse.json(
    {
      ok: failures.length === 0,
      sources,
      failures,
      retention:
        retentionResult.status === "fulfilled"
          ? { ok: true, deleted: retentionResult.value }
          : { ok: false, reason: "retention_error" },
      fetchedAt: new Date().toISOString(),
    },
    { status: failures.length === 0 ? 200 : 502 }
  );
}
