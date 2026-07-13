import { describe, expect, it } from "vitest";
import { openMeteoObservedAt } from "./open-meteo";

describe("Open-Meteo source timestamps", () => {
  it("converts provider-local time using the supplied UTC offset", () => {
    expect(
      openMeteoObservedAt("2020-07-13T22:00", 10 * 60 * 60)?.toISOString()
    ).toBe("2020-07-13T12:00:00.000Z");
  });

  it("rejects malformed provider timestamps and offsets", () => {
    expect(openMeteoObservedAt("not-a-time", 36_000)).toBeNull();
    expect(openMeteoObservedAt("2020-07-13T22:00", "36000")).toBeNull();
    expect(openMeteoObservedAt("2020-07-13T22:00", 100_000)).toBeNull();
  });
});
