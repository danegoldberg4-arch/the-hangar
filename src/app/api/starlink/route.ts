import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  FRESHNESS_THRESHOLDS,
  storedObservationMeta,
  unavailableMeta,
} from "@/lib/integrations/freshness";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const latest = await prisma.starlinkStatus.findFirst({
    where: { sourceTimestampTrusted: true },
    orderBy: { observedAt: "desc" },
  });

  if (!latest) {
    return NextResponse.json(
      {
        error: "No Starlink observation is available",
        connected: null,
        operationalState: "unknown",
        ...unavailableMeta(),
      },
      { status: 503 }
    );
  }

  const freshness = storedObservationMeta(
    latest.observedAt,
    FRESHNESS_THRESHOLDS.starlink,
    latest.sourceTimestampTrusted
  );

  return NextResponse.json({
    connected: latest.connected,
    state: latest.state,
    obstructionAvg: latest.obstructionAvg,
    uptimeSeconds: latest.uptimeSeconds,
    downlinkThroughputBps: latest.downlinkThroughputBps,
    uplinkThroughputBps: latest.uplinkThroughputBps,
    latencyMs: latest.latencyMs,
    firmwareVersion: latest.firmwareVersion,
    ...freshness,
    receivedAt: latest.recordedAt.toISOString(),
    operationalState:
      freshness.freshness === "live"
        ? latest.state?.toLowerCase() ?? (latest.connected ? "connected" : "unknown")
        : "unknown",
  });
}
