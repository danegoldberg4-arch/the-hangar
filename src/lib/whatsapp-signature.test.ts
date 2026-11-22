import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hasValidWhatsAppSignature } from "./whatsapp/client";

function sign(body: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("WhatsApp webhook signatures", () => {
  const body = '{"object":"whatsapp_business_account"}';

  it("accepts a signature made with the app secret", () => {
    expect(hasValidWhatsAppSignature(body, sign(body, "app-secret"), "app-secret")).toBe(true);
  });

  it("rejects a missing, forged, or mismatched signature", () => {
    expect(hasValidWhatsAppSignature(body, null, "app-secret")).toBe(false);
    expect(hasValidWhatsAppSignature(body, sign(body, "other-secret"), "app-secret")).toBe(false);
    expect(hasValidWhatsAppSignature(body, "sha256=abcd", "app-secret")).toBe(false);
    expect(hasValidWhatsAppSignature(body, sign(body, "app-secret"), undefined)).toBe(false);
    expect(hasValidWhatsAppSignature(`${body} `, sign(body, "app-secret"), "app-secret")).toBe(
      false
    );
  });
});
