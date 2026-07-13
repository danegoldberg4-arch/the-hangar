import { describe, expect, it } from "vitest";
import { dateOnlyInTimeZone, formatUtcDateOnly } from "./date-only";
import { calculateStatus, computeNextDue } from "./maintenance";

describe("maintenance date-only scheduling", () => {
  it("uses the Sydney calendar date independently of the server timezone", () => {
    const instant = new Date("2026-07-13T15:00:00.000Z");

    expect(formatUtcDateOnly(dateOnlyInTimeZone(instant))).toBe("2026-07-14");
  });

  it("adds intervals with UTC calendar arithmetic", () => {
    const completion = new Date("2026-01-31T23:45:00.000Z");

    expect(computeNextDue(completion, 1)?.toISOString()).toBe(
      "2026-02-01T00:00:00.000Z"
    );
    expect(completion.toISOString()).toBe("2026-01-31T23:45:00.000Z");
  });

  it("classifies due dates against Sydney today across DST", () => {
    const now = new Date("2026-10-03T16:30:00.000Z");

    expect(
      calculateStatus(90, null, new Date("2026-10-04T00:00:00.000Z"), now)
    ).toEqual({ status: "due_soon", daysUntilDue: 0 });
    expect(
      calculateStatus(90, null, new Date("2026-10-03T23:59:59.000Z"), now)
    ).toEqual({ status: "overdue", daysUntilDue: -1 });
  });
});
