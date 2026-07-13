import { describe, expect, it } from "vitest";
import {
  observationMeta,
  parseSourceTimestamp,
  advanceObservationMeta,
  storedObservationMeta,
  unavailableMeta,
} from "./freshness";

describe("telemetry freshness", () => {
  const now = new Date("2026-07-13T12:00:00.000Z").getTime();

  it("rejects missing, invalid, and future source timestamps", () => {
    expect(parseSourceTimestamp(null, now)).toBeNull();
    expect(parseSourceTimestamp("not-a-date", now)).toBeNull();
    expect(
      parseSourceTimestamp("2026-07-13T12:00:00.001Z", now)
    ).toBeNull();
  });

  it("classifies observations at the live threshold", () => {
    expect(
      observationMeta("2026-07-13T11:45:00.000Z", 15 * 60_000, now)
    ).toEqual({
      freshness: "live",
      observedAt: "2026-07-13T11:45:00.000Z",
      ageSeconds: 900,
    });
    expect(
      observationMeta("2026-07-13T11:44:59.999Z", 15 * 60_000, now)
        .freshness
    ).toBe("stale");
  });

  it("never presents an untrusted legacy receipt timestamp as live", () => {
    expect(
      storedObservationMeta(
        "2026-07-13T11:59:59.000Z",
        15 * 60_000,
        false,
        now
      )
    ).toEqual(unavailableMeta());
  });

  it("ages a cached snapshot and downgrades it after a refresh failure", () => {
    const snapshot = observationMeta(
      "2026-07-13T11:59:00.000Z",
      15 * 60_000,
      now
    );

    expect(advanceObservationMeta(snapshot, 15 * 60_000, 0, true)).toEqual({
      freshness: "stale",
      observedAt: "2026-07-13T11:59:00.000Z",
      ageSeconds: 60,
    });
    expect(
      advanceObservationMeta(snapshot, 15 * 60_000, 16 * 60_000)
        .freshness
    ).toBe("stale");
    expect(
      advanceObservationMeta(
        { ...snapshot, freshness: "stale", ageSeconds: 900 },
        15 * 60_000,
        0
      ).freshness
    ).toBe("stale");
  });
});
