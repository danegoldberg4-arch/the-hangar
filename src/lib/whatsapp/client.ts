const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = "v21.0";

export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("[whatsapp] Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: text },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[whatsapp] Send failed:", res.status, err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[whatsapp] Send error:", error);
    return false;
  }
}

export function verifyWebhook(mode: string | null, token: string | null): boolean {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken) {
    return true;
  }
  return false;
}
