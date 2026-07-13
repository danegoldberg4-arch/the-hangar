import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const latest = await prisma.starlinkStatus.findFirst({
    orderBy: { recordedAt: "desc" },
  });

  if (!latest) {
    return NextResponse.json({
      error: "No Starlink data yet. Waiting for Raspberry Pi relay to start pushing data.",
      connected: false,
    }, { status: 404 });
  }

  const ageMin = (Date.now() - latest.recordedAt.getTime()) / (1000 * 60);

  return NextResponse.json({
    connected: latest.connected,
    obstructionAvg: latest.obstructionAvg,
    uptimeSeconds: latest.uptimeSeconds,
    downlinkThroughputBps: latest.downlinkThroughputBps,
    uplinkThroughputBps: latest.uplinkThroughputBps,
    latencyMs: latest.latencyMs,
    firmwareVersion: latest.firmwareVersion,
    recordedAt: latest.recordedAt.toISOString(),
    stale: ageMin > 5,
  });
}
