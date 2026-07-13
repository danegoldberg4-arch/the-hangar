import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidBearerToken } from "@/lib/bearer-auth";

const MAX_BACKLOG_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type Payload = Record<string, unknown>;

export async function POST(request: NextRequest) {
  const ingestToken = process.env.INGEST_TOKEN;
  if (!ingestToken) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }
  if (!hasValidBearerToken(request, ingestToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!isObject(body) || typeof body.source !== "string" || !isObject(body.payload)) {
    return NextResponse.json({ error: "source and payload are required" }, { status: 400 });
  }

  const observedAt = parseObservedAt(body.observedAt);
  if (!observedAt) {
    return NextResponse.json(
      { error: "observedAt must be a UTC timestamp from the source" },
      { status: 422 }
    );
  }

  const contentHash = createHash("sha256")
    .update(
      stableStringify({
        source: body.source,
        observedAt: observedAt.toISOString(),
        payload: body.payload,
      })
    )
    .digest("hex");
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey
      : contentHash;
  if (idempotencyKey.length > 200) {
    return NextResponse.json({ error: "idempotencyKey is too long" }, { status: 422 });
  }
  const sourceId = `${body.source}:${idempotencyKey}`;

  switch (body.source) {
    case "starlink":
      return handleStarlink(body.payload, observedAt, sourceId, contentHash);
    case "water_tank":
      return handleWaterTank(body.payload, observedAt, sourceId, contentHash);
    case "gas_bottle":
      return handleGasBottle(body.payload, observedAt, sourceId, contentHash);
    case "pool":
      return handlePool(body.payload, observedAt, sourceId, contentHash);
    default:
      return NextResponse.json(
        { error: "Unsupported source" },
        { status: 400 }
      );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function parseObservedAt(value: unknown): Date | null {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const observedAt = new Date(value);
  const timestamp = observedAt.getTime();
  const now = Date.now();
  if (
    !Number.isFinite(timestamp) ||
    timestamp > now + 5 * 60 * 1000 ||
    timestamp < now - MAX_BACKLOG_AGE_MS
  ) {
    return null;
  }
  return observedAt;
}

function optionalNumber(payload: Payload, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validOptionalNumber(
  payload: Payload,
  key: string,
  minimum: number,
  maximum: number
): boolean {
  const value = payload[key];
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function validOptionalInteger(
  payload: Payload,
  key: string,
  minimum: number,
  maximum: number
): boolean {
  const value = payload[key];
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function idempotencyConflict() {
  return NextResponse.json(
    { error: "idempotencyKey was already used for different content" },
    { status: 409 }
  );
}

const STARLINK_STATES = new Set([
  "CONNECTED",
  "BOOTING",
  "SEARCHING",
  "STOWED",
  "THERMAL_SHUTDOWN",
  "NO_SATS",
  "OBSTRUCTED",
  "NO_DOWNLINK",
  "NO_PINGS",
  "UNKNOWN",
]);

async function handleStarlink(
  payload: Payload,
  observedAt: Date,
  sourceId: string,
  contentHash: string
) {
  const state = typeof payload.state === "string" ? payload.state.trim().toUpperCase() : "";
  if (
    typeof payload.connected !== "boolean" ||
    !STARLINK_STATES.has(state) ||
    payload.connected !== (state === "CONNECTED") ||
    !validOptionalNumber(payload, "obstructionAvg", 0, 100) ||
    !validOptionalInteger(payload, "uptimeSeconds", 0, 2_147_483_647) ||
    !validOptionalNumber(payload, "downlinkThroughputBps", 0, Number.MAX_SAFE_INTEGER) ||
    !validOptionalNumber(payload, "uplinkThroughputBps", 0, Number.MAX_SAFE_INTEGER) ||
    !validOptionalNumber(payload, "latencyMs", 0, 60 * 60 * 1000) ||
    (payload.firmwareVersion !== undefined && typeof payload.firmwareVersion !== "string")
  ) {
    return NextResponse.json({ error: "Invalid Starlink payload" }, { status: 422 });
  }

  const record = await prisma.starlinkStatus.upsert({
    where: { sourceId },
    create: {
      sourceId,
      contentHash,
      observedAt,
      sourceTimestampTrusted: true,
      connected: payload.connected,
      state,
      obstructionAvg: optionalNumber(payload, "obstructionAvg"),
      uptimeSeconds: optionalNumber(payload, "uptimeSeconds"),
      downlinkThroughputBps: optionalNumber(payload, "downlinkThroughputBps"),
      uplinkThroughputBps: optionalNumber(payload, "uplinkThroughputBps"),
      latencyMs: optionalNumber(payload, "latencyMs"),
      firmwareVersion:
        typeof payload.firmwareVersion === "string" ? payload.firmwareVersion.slice(0, 200) : null,
    },
    update: {},
  });
  if (record.contentHash !== contentHash) return idempotencyConflict();

  return NextResponse.json({ ok: true, id: record.id, observedAt: record.observedAt, state });
}

async function handleWaterTank(
  payload: Payload,
  observedAt: Date,
  sourceId: string,
  contentHash: string
) {
  const tank = typeof payload.tank === "string" ? payload.tank.trim() : "";
  const levelLitres = optionalNumber(payload, "levelLitres");
  const capacityLitres = optionalNumber(payload, "capacityLitres");
  if (
    !/^[a-zA-Z0-9_-]{1,64}$/.test(tank) ||
    levelLitres === null ||
    capacityLitres === null ||
    capacityLitres <= 0 ||
    capacityLitres > 1_000_000 ||
    levelLitres < 0 ||
    levelLitres > capacityLitres
  ) {
    return NextResponse.json({ error: "Invalid water tank payload" }, { status: 422 });
  }

  const record = await prisma.systemStatus.upsert({
    where: { sourceId },
    create: {
      sourceId,
      contentHash,
      observedAt,
      sourceTimestampTrusted: true,
      system: `water_tank_${tank}`,
      status: `${levelLitres}/${capacityLitres}`,
      data: JSON.stringify({
        levelLitres,
        capacityLitres,
        percent: Math.round((levelLitres / capacityLitres) * 100),
      }),
    },
    update: {},
  });
  if (record.contentHash !== contentHash) return idempotencyConflict();
  return NextResponse.json({ ok: true, id: record.id, observedAt: record.observedAt });
}

async function handleGasBottle(
  payload: Payload,
  observedAt: Date,
  sourceId: string,
  contentHash: string
) {
  const bank = typeof payload.bank === "string" ? payload.bank.trim() : "";
  const activeBottle =
    typeof payload.activeBottle === "string" ? payload.activeBottle.trim() : "";
  const onReserve = payload.onReserve;
  if (
    !/^[a-zA-Z0-9 _-]{1,64}$/.test(bank) ||
    !activeBottle ||
    activeBottle.length > 100 ||
    typeof onReserve !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid gas bottle payload" }, { status: 422 });
  }

  const bankKey = bank.toLowerCase();
  const system = `gas_bottle:${bankKey}`;
  const alertId = `gas-reserve:${createHash("sha256")
    .update(bankKey)
    .digest("hex")
    .slice(0, 24)}`;

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`the-hangar:gas-alert:${bankKey}`}))`;
    await tx.alert.updateMany({
      where: { id: "gas-reserve", isActive: true },
      data: { isActive: false, resolvedAt: observedAt },
    });

    const existing = await tx.systemStatus.findUnique({ where: { sourceId } });
    if (existing) {
      return existing.contentHash === contentHash
        ? { kind: "duplicate" as const, id: existing.id, applied: false }
        : { kind: "conflict" as const, id: existing.id, applied: false };
    }

    const record = await tx.systemStatus.create({
      data: {
        sourceId,
        contentHash,
        observedAt,
        sourceTimestampTrusted: true,
        system,
        status: onReserve ? "reserve" : "normal",
        data: JSON.stringify({ bank, activeBottle, onReserve }),
      },
    });
    const latest = await tx.systemStatus.findFirst({
      where: { system, sourceTimestampTrusted: true },
      orderBy: [{ observedAt: "desc" }, { recordedAt: "desc" }, { id: "desc" }],
    });
    if (latest?.id !== record.id) {
      return { kind: "accepted" as const, id: record.id, applied: false };
    }

    if (onReserve) {
      await tx.alert.upsert({
        where: { id: alertId },
        create: {
          id: alertId,
          system: `gas:${bankKey}`,
          severity: "warning",
          message: `Gas bank ${bank} switched to reserve (active: ${activeBottle}). Order a refill now.`,
          isActive: true,
        },
        update: {
          isActive: true,
          message: `Gas bank ${bank} switched to reserve (active: ${activeBottle}). Order a refill now.`,
          resolvedAt: null,
        },
      });
    } else {
      await tx.alert.updateMany({
        where: { id: alertId, isActive: true },
        data: { isActive: false, resolvedAt: observedAt },
      });
    }
    return { kind: "accepted" as const, id: record.id, applied: true };
  });

  if (outcome.kind === "conflict") return idempotencyConflict();
  return NextResponse.json({
    ok: true,
    id: outcome.id,
    observedAt,
    duplicate: outcome.kind === "duplicate",
    currentStateApplied: outcome.applied,
  });
}

async function handlePool(
  payload: Payload,
  observedAt: Date,
  sourceId: string,
  contentHash: string
) {
  const hasTemp = Object.hasOwn(payload, "tempC");
  const hasPh = Object.hasOwn(payload, "phLevel");
  const hasPump = Object.hasOwn(payload, "pumpRunning");
  const tempC = optionalNumber(payload, "tempC");
  const phLevel = optionalNumber(payload, "phLevel");
  const pumpRunning = payload.pumpRunning;
  if (
    (!hasTemp && !hasPh && !hasPump) ||
    (hasTemp && (tempC === null || tempC < -10 || tempC > 60)) ||
    (hasPh && (phLevel === null || phLevel < 0 || phLevel > 14)) ||
    (hasPump && typeof pumpRunning !== "boolean")
  ) {
    return NextResponse.json({ error: "Invalid pool payload" }, { status: 422 });
  }

  const record = await prisma.systemStatus.upsert({
    where: { sourceId },
    create: {
      sourceId,
      contentHash,
      observedAt,
      sourceTimestampTrusted: true,
      system: "pool",
      status:
        typeof pumpRunning === "boolean"
          ? pumpRunning
            ? "pump_on"
            : "pump_off"
          : "pump_unknown",
      data: JSON.stringify({ tempC, pumpRunning: pumpRunning ?? null, phLevel }),
    },
    update: {},
  });
  if (record.contentHash !== contentHash) return idempotencyConflict();
  return NextResponse.json({ ok: true, id: record.id, observedAt: record.observedAt });
}
