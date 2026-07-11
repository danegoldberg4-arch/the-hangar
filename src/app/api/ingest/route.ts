import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const INGEST_TOKEN = process.env.INGEST_TOKEN;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!INGEST_TOKEN) {
    return NextResponse.json(
      { error: "Ingest not configured. Set INGEST_TOKEN env var." },
      { status: 503 }
    );
  }

  if (authHeader !== `Bearer ${INGEST_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { source, payload } = body;

  if (!source || !payload) {
    return NextResponse.json(
      { error: "source and payload are required" },
      { status: 400 }
    );
  }

  switch (source) {
    case "starlink":
      return await handleStarlink(payload);

    case "water_tank":
      return await handleWaterTank(payload);

    case "gas_bottle":
      return await handleGasBottle(payload);

    case "pool":
      return await handlePool(payload);

    default:
      return NextResponse.json(
        { error: `Unknown source: ${source}` },
        { status: 400 }
      );
  }
}

async function handleStarlink(payload: {
  connected?: boolean;
  obstructionAvg?: number;
  uptimeSeconds?: number;
  downlinkThroughputBps?: number;
  uplinkThroughputBps?: number;
  latencyMs?: number;
  firmwareVersion?: string;
}) {
  const record = await prisma.starlinkStatus.create({
    data: {
      connected: payload.connected ?? false,
      obstructionAvg: payload.obstructionAvg ?? null,
      uptimeSeconds: payload.uptimeSeconds ?? null,
      downlinkThroughputBps: payload.downlinkThroughputBps ?? null,
      uplinkThroughputBps: payload.uplinkThroughputBps ?? null,
      latencyMs: payload.latencyMs ?? null,
      firmwareVersion: payload.firmwareVersion ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: record.id });
}

async function handleWaterTank(payload: {
  tank: string;
  levelLitres: number;
  capacityLitres: number;
}) {
  await prisma.systemStatus.create({
    data: {
      system: `water_tank_${payload.tank}`,
      status: `${payload.levelLitres}/${payload.capacityLitres}`,
      data: JSON.stringify({
        levelLitres: payload.levelLitres,
        capacityLitres: payload.capacityLitres,
        percent: Math.round((payload.levelLitres / payload.capacityLitres) * 100),
      }),
    },
  });

  return NextResponse.json({ ok: true });
}

async function handleGasBottle(payload: {
  bank: string;
  activeBottle: string;
  onReserve: boolean;
}) {
  await prisma.systemStatus.create({
    data: {
      system: "gas_bottle",
      status: payload.onReserve ? "reserve" : "normal",
      data: JSON.stringify(payload),
    },
  });

  if (payload.onReserve) {
    await prisma.alert.upsert({
      where: { id: "gas-reserve" },
      create: {
        id: "gas-reserve",
        system: "gas",
        severity: "warning",
        message: "Gas bottles have switched to reserve. Order a refill now.",
        isActive: true,
      },
      update: {
        isActive: true,
        message: `Gas bottles switched to reserve (active: ${payload.activeBottle}). Order a refill now.`,
        resolvedAt: null,
      },
    });
  } else {
    await prisma.alert.updateMany({
      where: { id: "gas-reserve", isActive: true },
      data: { isActive: false, resolvedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}

async function handlePool(payload: {
  tempC?: number;
  pumpRunning?: boolean;
  phLevel?: number;
}) {
  await prisma.systemStatus.create({
    data: {
      system: "pool",
      status: payload.pumpRunning ? "pump_on" : "pump_off",
      data: JSON.stringify(payload),
    },
  });

  return NextResponse.json({ ok: true });
}
