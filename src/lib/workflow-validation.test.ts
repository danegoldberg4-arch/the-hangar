import { describe, expect, it } from "vitest";
import {
  parseDateOnly,
  parseMaintenanceParts,
  validateMaintenanceCreate,
  validateMaintenanceLog,
  validateRestockCreate,
  validateVisitCreate,
  validateVisitDateOrder,
  validateVisitUpdate,
} from "./workflow-validation";

describe("workflow validation", () => {
  it("requires strict, real date-only visit values", () => {
    expect(parseDateOnly("2026-02-29")).toBeNull();
    expect(parseDateOnly("2026-07-13T00:00:00Z")).toBeNull();
    expect(parseDateOnly("not-a-date")).toBeNull();
    expect(parseDateOnly("2028-02-29")?.toISOString()).toBe(
      "2028-02-29T00:00:00.000Z"
    );
  });

  it("allows inclusive same-day visits and rejects reversed ranges", () => {
    const sameDay = validateVisitCreate({
      visitorName: "Alex",
      startDate: "2026-07-13",
      endDate: "2026-07-13",
    });
    expect(sameDay.ok).toBe(true);

    const reversed = validateVisitCreate({
      visitorName: "Alex",
      startDate: "2026-07-14",
      endDate: "2026-07-13",
    });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.errors.endDate).toMatch(/on or after/);
  });

  it("validates partial visit updates and merged date order", () => {
    expect(validateVisitUpdate({ notes: "Updated" }).ok).toBe(true);
    expect(validateVisitUpdate({}).ok).toBe(false);

    const start = parseDateOnly("2026-08-02");
    const end = parseDateOnly("2026-08-01");
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    expect(validateVisitDateOrder(start!, end!).ok).toBe(false);
  });

  it("normalizes maintenance parts and rejects unsafe intervals", () => {
    const valid = validateMaintenanceCreate({
      name: "Pump service",
      category: "pool",
      intervalDays: 90,
      parts: [{ name: "Filter", partNumber: " F-100 " }],
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(JSON.parse(valid.value.parts)).toEqual([
        { name: "Filter", partNumber: "F-100" },
      ]);
    }

    expect(
      validateMaintenanceCreate({
        name: "Pump service",
        category: "pool",
        intervalDays: -1,
      }).ok
    ).toBe(false);
  });

  it("accepts backdated maintenance logs with selected parts", () => {
    const parsed = validateMaintenanceLog({
      completedAt: "2025-12-01",
      notes: "Historical entry",
      partsUsed: [{ name: "Belt" }],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.completedAt.toISOString()).toBe(
        "2025-12-01T00:00:00.000Z"
      );
      expect(parseMaintenanceParts(parsed.value.partsUsed)).toEqual([
        { name: "Belt" },
      ]);
    }

    expect(
      validateMaintenanceLog(
        { completedAt: "2026-07-14" },
        new Date("2026-07-13T00:00:00.000Z")
      ).ok
    ).toBe(false);
  });

  it("rejects unsupported restock categories", () => {
    expect(
      validateRestockCreate({
        name: "Coffee",
        category: "secret-cupboard",
      }).ok
    ).toBe(false);
  });
});
