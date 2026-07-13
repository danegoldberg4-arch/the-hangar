import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateStatus, computeNextDue } from "./maintenance";

describe("maintenance scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies unscheduled work", () => {
    expect(calculateStatus(0, null, null)).toEqual({
      status: "as_needed",
      daysUntilDue: null,
    });
    expect(calculateStatus(90, null, null)).toEqual({
      status: "no_history",
      daysUntilDue: null,
    });
  });

  it("classifies overdue, due-soon, and upcoming dates", () => {
    expect(calculateStatus(90, null, new Date("2026-07-12T00:00:00.000Z"))).toEqual({
      status: "overdue",
      daysUntilDue: -1,
    });
    expect(calculateStatus(90, null, new Date("2026-07-20T00:00:00.000Z"))).toEqual({
      status: "due_soon",
      daysUntilDue: 7,
    });
    expect(calculateStatus(90, null, new Date("2026-09-01T00:00:00.000Z"))).toEqual({
      status: "upcoming",
      daysUntilDue: 50,
    });
  });

  it("computes the next due date without mutating the completion date", () => {
    const completed = new Date("2026-01-31T00:00:00.000Z");
    const next = computeNextDue(completed, 30);

    expect(next?.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(completed.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(computeNextDue(completed, 0)).toBeNull();
  });
});
