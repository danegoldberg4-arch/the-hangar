import { describe, expect, it } from "vitest";
import {
  clientIpFromRequest,
  hashAuthRateLimitKey,
  normalizeRateLimitEmail,
  secondsUntil,
} from "./auth-rate-limit-key";

describe("authentication rate-limit keys", () => {
  it("normalizes email identifiers without retaining surrounding input", () => {
    expect(normalizeRateLimitEmail("  Person@Example.COM  ")).toBe(
      "person@example.com"
    );
    expect(normalizeRateLimitEmail(undefined)).toBe("missing");
    expect(normalizeRateLimitEmail("   ")).toBe("missing");
  });

  it("uses the first forwarded client address and stable fallbacks", () => {
    const forwarded = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.4" },
    });
    const direct = new Request("https://example.test", {
      headers: { "x-real-ip": "2001:DB8::1" },
    });
    const unknown = new Request("https://example.test");

    expect(clientIpFromRequest(forwarded)).toBe("203.0.113.8");
    expect(clientIpFromRequest(direct)).toBe("2001:db8::1");
    expect(clientIpFromRequest(unknown)).toBe("unknown");
  });

  it("is stable and scoped without exposing identifiers", () => {
    const input = {
      scope: "credentials_login",
      dimension: "email" as const,
      identifier: "person@example.com",
      secret: "test-only-secret",
    };
    const first = hashAuthRateLimitKey(input);
    const again = hashAuthRateLimitKey(input);
    const otherScope = hashAuthRateLimitKey({
      ...input,
      scope: "registration",
    });

    expect(first).toBe(again);
    expect(first).toHaveLength(64);
    expect(first).not.toBe(otherScope);
    expect(first).not.toContain(input.identifier);
    expect(() => hashAuthRateLimitKey({ ...input, secret: "" })).toThrow(
      /not configured/
    );
  });

  it("rounds Retry-After seconds up and never returns less than one", () => {
    const now = new Date("2026-07-13T00:00:00.000Z");
    expect(secondsUntil(new Date("2026-07-13T00:00:01.001Z"), now)).toBe(2);
    expect(secondsUntil(new Date("2026-07-12T23:59:00.000Z"), now)).toBe(1);
  });
});
