import { describe, expect, it } from "vitest";
import {
  validatePlugInventoryCreate,
  validatePlugInventoryUpdate,
} from "./plug-inventory-validation";

describe("plug inventory validation", () => {
  it("normalizes create input and supplies inventory defaults", () => {
    const parsed = validatePlugInventoryCreate({
      name: "  Pool pump  ",
      deviceId: "  shed-pump-1  ",
      room: "  Pump shed  ",
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        name: "Pool pump",
        type: "tapo",
        deviceId: "shed-pump-1",
        ip: "",
        room: "Pump shed",
      },
    });
  });

  it("rejects unsupported, missing, non-string, and oversized create fields", () => {
    const parsed = validatePlugInventoryCreate({
      name: 42,
      type: "cloud-only",
      room: "x".repeat(161),
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors).toMatchObject({
        name: "name must be a string.",
        type: "type must be tapo, shelly, or manual.",
        deviceId: "deviceId is required.",
        room: "room must be 160 characters or fewer.",
      });
    }
  });

  it("accepts bounded partial updates and preserves an explicitly empty room", () => {
    expect(validatePlugInventoryUpdate({ name: "  Battery charger  " })).toEqual({
      ok: true,
      value: { name: "Battery charger" },
    });
    expect(validatePlugInventoryUpdate({ room: "   " })).toEqual({
      ok: true,
      value: { room: "" },
    });
  });

  it("rejects empty and invalid partial updates", () => {
    expect(validatePlugInventoryUpdate({}).ok).toBe(false);
    expect(validatePlugInventoryUpdate({ action: "toggle" }).ok).toBe(false);
    expect(validatePlugInventoryUpdate({ name: "  " }).ok).toBe(false);
    expect(validatePlugInventoryUpdate({ room: false }).ok).toBe(false);
  });
});
