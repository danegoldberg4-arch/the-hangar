import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeNextDue } from "@/lib/maintenance";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]/log">
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  const { notes, partsUsed, completedAt } = body;

  const item = await prisma.maintenanceItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Maintenance item not found" }, { status: 404 });
  }

  const logDate = completedAt ? new Date(completedAt) : new Date();
  const userId = (session.user as { id?: string }).id;

  const log = await prisma.maintenanceLog.create({
    data: {
      itemId: id,
      userId: userId || null,
      completedBy: session.user.name || "Unknown",
      notes: notes || "",
      partsUsed: partsUsed || "[]",
      completedAt: logDate,
    },
  });

  const nextDue = computeNextDue(logDate, item.intervalDays);
  await prisma.maintenanceItem.update({
    where: { id },
    data: {
      lastCompletedAt: logDate,
      nextDueAt: nextDue,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(log, { status: 201 });
}
