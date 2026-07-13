import { describe, expect, it } from "vitest";
import {
  dateKeyInTimeZone,
  startOfDayInTimeZone,
  zonedDateTimeToUtc,
} from "./time";

describe("Sydney calendar conversion", () => {
  it("uses the next Sydney date before UTC rolls over", () => {
    expect(
      dateKeyInTimeZone(
        new Date("2026-07-13T15:00:00.000Z"),
        "Australia/Sydney"
      )
    ).toBe("2026-07-14");
  });

  it("converts winter and summer midnight with the correct DST offset", () => {
    expect(
      zonedDateTimeToUtc(
        { year: 2026, month: 7, day: 13 },
        "Australia/Sydney"
      ).toISOString()
    ).toBe("2026-07-12T14:00:00.000Z");
    expect(
      zonedDateTimeToUtc(
        { year: 2026, month: 12, day: 13 },
        "Australia/Sydney"
      ).toISOString()
    ).toBe("2026-12-12T13:00:00.000Z");
  });

  it("finds the start of the current Sydney day", () => {
    expect(
      startOfDayInTimeZone(
        new Date("2026-10-03T16:30:00.000Z"),
        "Australia/Sydney"
      ).toISOString()
    ).toBe("2026-10-03T14:00:00.000Z");
  });
});
