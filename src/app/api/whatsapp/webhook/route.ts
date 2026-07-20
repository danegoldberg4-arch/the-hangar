import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhook, sendWhatsAppMessage } from "@/lib/whatsapp/client";
import {
  matchRestockItems,
  matchMaintenanceItems,
  isConfirmation,
  isCancellation,
  formatMatchReply,
  executeMatch,
  type MatchedItem,
} from "@/lib/whatsapp/matcher";

// Pending confirmations — stored in DB as system status
// Key: phone number, Value: matches to confirm
const PENDING_KEY_PREFIX = "whatsapp_pending_";

async function getPending(phone: string): Promise<MatchedItem[] | null> {
  const record = await prisma.systemStatus.findFirst({
    where: { system: PENDING_KEY_PREFIX + phone },
    orderBy: { recordedAt: "desc" },
  });
  if (!record) return null;
  try {
    return JSON.parse(record.data);
  } catch {
    return null;
  }
}

async function setPending(phone: string, matches: MatchedItem[] | null) {
  if (matches) {
    await prisma.systemStatus.create({
      data: {
        system: PENDING_KEY_PREFIX + phone,
        status: "pending",
        data: JSON.stringify(matches),
      },
    });
  }
  // If null, we just don't create a new record — old ones become stale
}

// Reserved for future phone-to-user mapping


export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (verifyWebhook(mode, token)) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta webhook verification
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages || [];
          for (const msg of messages) {
            if (msg.type !== "text") continue;

            const from = msg.from; // phone number
            const text = msg.text?.body || "";
            const profileName = change.value?.contacts?.[0]?.profile?.name || "Family member";

            await handleMessage(from, text, profileName);
          }
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[whatsapp] Webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 }); // Always 200 to Meta
  }
}

async function handleMessage(from: string, text: string, profileName: string) {
  // Check if this is a confirmation of a pending action
  const pending = await getPending(from);

  if (pending && isConfirmation(text)) {
    // Execute all pending matches
    const results: string[] = [];
    for (const match of pending) {
      const result = await executeMatch(match, profileName);
      results.push(result);
    }
    await setPending(from, null);
    await sendWhatsAppMessage(from, results.join("\n\n"));
    return;
  }

  if (pending && isCancellation(text)) {
    await setPending(from, null);
    await sendWhatsAppMessage(from, "No worries — cancelled. 👍");
    return;
  }

  // Try to match against restock and maintenance items
  const [restockMatches, maintenanceMatches] = await Promise.all([
    matchRestockItems(text),
    matchMaintenanceItems(text),
  ]);

  const allMatches = [...restockMatches, ...maintenanceMatches];

  if (allMatches.length === 0) {
    // Not a match — ignore silently (don't spam the group)
    return;
  }

  // Store pending confirmation
  await setPending(from, allMatches);

  // Reply with confirmation request
  const reply = formatMatchReply(allMatches);
  await sendWhatsAppMessage(from, reply);
}
