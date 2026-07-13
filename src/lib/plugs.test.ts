import { describe, expect, it } from "vitest";
import {
  defaultAutomation,
  parseAutomation,
  serializeAutomation,
  shouldPlugTurnOff,
  shouldPlugTurnOn,
} from "./plugs";

describe("plug automation rules", () => {
  it("falls back safely for invalid stored settings", () => {
    expect(parseAutomation("not-json")).toEqual(defaultAutomation);
  });

  it("merges stored settings with defaults", () => {
    expect(parseAutomation('{"enabled":true,"solarThresholdW":3000}')).toEqual({
      ...defaultAutomation,
      enabled: true,
      solarThresholdW: 3000,
    });
  });

  it("requires both solar and battery thresholds before turning on", () => {
    const automation = { ...defaultAutomation, enabled: true };

    expect(shouldPlugTurnOn(automation, 2000, 80)).toBe(true);
    expect(shouldPlugTurnOn(automation, 1999, 80)).toBe(false);
    expect(shouldPlugTurnOn(automation, 2000, 79)).toBe(false);
    expect(shouldPlugTurnOn({ ...automation, enabled: false }, 9999, 100)).toBe(false);
  });

  it("turns off only below the configured battery threshold", () => {
    const automation = { ...defaultAutomation, enabled: true };

    expect(shouldPlugTurnOff(automation, 49)).toBe(true);
    expect(shouldPlugTurnOff(automation, 50)).toBe(false);
    expect(shouldPlugTurnOff({ ...automation, enabled: false }, 0)).toBe(false);
  });

  it("round-trips valid settings", () => {
    expect(parseAutomation(serializeAutomation(defaultAutomation))).toEqual(defaultAutomation);
  });
});
