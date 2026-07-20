import { prisma } from "@/lib/prisma";

export interface MatchedItem {
  type: "restock" | "maintenance";
  id: string;
  name: string;
  action: "resolve" | "log";
}

const BROUGHT_KEYWORDS = [
  "brought", "got", "bought", "picked up", "picked-up",
  "brought down", "brought over", "have", "got the", "packed",
  "grabbed", "found", "scored",
];

const DONE_KEYWORDS = [
  "fixed", "done", "completed", "finished", "replaced",
  "changed", "installed", "serviced", "cleaned", "sorted",
  "sorted out", "took care of", "dealt with",
];

const CONFIRM_KEYWORDS = ["yes", "y", "yeah", "yep", "confirm", "correct", "that's right", "thats right"];
const CANCEL_KEYWORDS = ["no", "n", "nope", "cancel", "wrong", "not that"];

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function fuzzyMatch(message: string, itemName: string): boolean {
  const msg = normalize(message);
  const item = normalize(itemName);

  // Direct mention
  if (msg.includes(item)) return true;

  // Match on key words from the item name
  const itemWords = item.split(" ").filter((w) => w.length > 2);
  const matchedWords = itemWords.filter((w) => msg.includes(w));

  // If most words match, consider it a match
  return matchedWords.length >= Math.ceil(itemWords.length * 0.6);
}

export async function matchRestockItems(message: string): Promise<MatchedItem[]> {
  const msg = normalize(message);
  const hasBrought = BROUGHT_KEYWORDS.some((k) => msg.includes(k));

  if (!hasBrought) return [];

  const items = await prisma.restockItem.findMany({
    where: { isResolved: false },
  });

  return items
    .filter((item) => fuzzyMatch(msg, item.name))
    .map((item) => ({
      type: "restock" as const,
      id: item.id,
      name: item.name,
      action: "resolve" as const,
    }));
}

export async function matchMaintenanceItems(message: string): Promise<MatchedItem[]> {
  const msg = normalize(message);
  const hasDone = DONE_KEYWORDS.some((k) => msg.includes(k));

  if (!hasDone) return [];

  const items = await prisma.maintenanceItem.findMany({
    where: { isActive: true },
  });

  return items
    .filter((item) => fuzzyMatch(msg, item.name))
    .map((item) => ({
      type: "maintenance" as const,
      id: item.id,
      name: item.name,
      action: "log" as const,
    }));
}

export function isConfirmation(message: string): boolean {
  const msg = normalize(message);
  return CONFIRM_KEYWORDS.some((k) => msg === k || msg.startsWith(k + " "));
}

export function isCancellation(message: string): boolean {
  const msg = normalize(message);
  return CANCEL_KEYWORDS.some((k) => msg === k || msg.startsWith(k + " "));
}

export function formatMatchReply(matches: MatchedItem[]): string {
  if (matches.length === 0) return "";

  if (matches.length === 1) {
    const m = matches[0];
    if (m.type === "restock") {
      return `Found "${m.name}" on the restock list. Reply YES to mark it as brought. ✅`;
    }
    return `Found "${m.name}" in maintenance. Reply YES to log it as completed. 🔧`;
  }

  const lines = matches.map((m, i) => {
    const emoji = m.type === "restock" ? "📦" : "🔧";
    return `${i + 1}. ${emoji} ${m.name}`;
  });

  return `Found ${matches.length} matching items:\n${lines.join("\n")}\n\nReply YES to confirm all, or the number to pick one.`;
}

export async function executeMatch(
  match: MatchedItem,
  personName: string,
  userId?: string
): Promise<string> {
  if (match.type === "restock" && match.action === "resolve") {
    await prisma.restockItem.update({
      where: { id: match.id },
      data: {
        isResolved: true,
        resolvedBy: personName,
        resolvedAt: new Date(),
      },
    });
    return `✅ "${match.name}" marked as brought by ${personName}!`;
  }

  if (match.type === "maintenance" && match.action === "log") {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id: match.id },
    });
    if (!item) return `❌ Couldn't find "${match.name}".`;

    await prisma.maintenanceLog.create({
      data: {
        itemId: match.id,
        userId: userId || null,
        completedBy: personName,
        completedAt: new Date(),
      },
    });

    const nextDue = item.intervalDays > 0
      ? new Date(Date.now() + item.intervalDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.maintenanceItem.update({
      where: { id: match.id },
      data: {
        lastCompletedAt: new Date(),
        nextDueAt: nextDue,
        updatedAt: new Date(),
      },
    });

    return `🔧 "${match.name}" logged as completed by ${personName}!${
      nextDue ? ` Next due: ${nextDue.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""
    }`;
  }

  return `❌ Something went wrong.`;
}
