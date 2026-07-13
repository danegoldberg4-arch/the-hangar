export type FreshnessState = "live" | "stale" | "unavailable";

export interface ObservationMeta {
  freshness: FreshnessState;
  observedAt: string | null;
  ageSeconds: number | null;
}

export const FRESHNESS_THRESHOLDS = {
  power: 15 * 60 * 1000,
  weather: 20 * 60 * 1000,
  starlink: 5 * 60 * 1000,
  fireDanger: 6 * 60 * 60 * 1000,
  forecast: 3 * 60 * 60 * 1000,
  rain: 3 * 60 * 60 * 1000,
} as const;

export function parseSourceTimestamp(
  value: Date | string | number | null | undefined,
  nowMs = Date.now()
): Date | null {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) && timestamp <= nowMs ? date : null;
}

export function observationMeta(
  observedAt: Date | string | number | null | undefined,
  liveForMs: number,
  nowMs = Date.now()
): ObservationMeta {
  if (observedAt === null || observedAt === undefined) {
    return unavailableMeta();
  }

  const date = parseSourceTimestamp(observedAt, nowMs);
  if (!date) {
    return unavailableMeta();
  }

  const observedMs = date.getTime();
  const ageMs = Math.max(0, nowMs - observedMs);
  const ageSeconds = Math.floor(ageMs / 1000);
  return {
    freshness: ageMs <= liveForMs ? "live" : "stale",
    observedAt: date.toISOString(),
    ageSeconds,
  };
}

export function storedObservationMeta(
  observedAt: Date | string | number | null | undefined,
  liveForMs: number,
  sourceTimestampTrusted: boolean,
  nowMs = Date.now()
): ObservationMeta {
  return sourceTimestampTrusted
    ? observationMeta(observedAt, liveForMs, nowMs)
    : unavailableMeta();
}

export function advanceObservationMeta(
  meta: ObservationMeta,
  liveForMs: number,
  elapsedMs: number,
  forceStale = false
): ObservationMeta {
  if (
    meta.freshness === "unavailable" ||
    meta.observedAt === null ||
    meta.ageSeconds === null
  ) {
    return unavailableMeta();
  }

  const ageMs = Math.max(0, meta.ageSeconds * 1000 + Math.max(0, elapsedMs));
  return {
    freshness:
      meta.freshness === "live" && ageMs <= liveForMs && !forceStale
        ? "live"
        : "stale",
    observedAt: meta.observedAt,
    ageSeconds: Math.floor(ageMs / 1000),
  };
}

export function unavailableMeta(): ObservationMeta {
  return { freshness: "unavailable", observedAt: null, ageSeconds: null };
}

export function freshnessLabel(meta: ObservationMeta): string {
  if (meta.freshness === "unavailable" || meta.ageSeconds === null) {
    return "unavailable";
  }
  if (meta.ageSeconds < 60) return meta.freshness;

  const minutes = Math.floor(meta.ageSeconds / 60);
  if (minutes < 60) return `${meta.freshness} · ${minutes}m old`;

  const hours = Math.floor(minutes / 60);
  return `${meta.freshness} · ${hours}h old`;
}
