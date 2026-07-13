import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDue } from "@/lib/maintenance";
import { requireAdmin, requireUser } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const item = await prisma.maintenanceItem.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await request.json();

  const { name, category, description, intervalDays, intervalLabel, parts, notes, assignedTo, isActive, nextDueAt: overrideDueAt } = body;

  const existing = await prisma.maintenanceItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newInterval = intervalDays !== undefined ? intervalDays : existing.intervalDays;
  let nextDueAt = existing.nextDueAt;

  if (overrideDueAt !== undefined) {
    nextDueAt = overrideDueAt ? new Date(overrideDueAt) : null;
  } else if (intervalDays !== undefined && existing.lastCompletedAt) {
    nextDueAt = computeNextDue(existing.lastCompletedAt, newInterval);
  }

  const item = await prisma.maintenanceItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(intervalDays !== undefined && { intervalDays: newInterval }),
      ...(intervalLabel !== undefined && { intervalLabel }),
      ...(parts !== undefined && { parts }),
      ...(notes !== undefined && { notes }),
      ...(assignedTo !== undefined && { assignedTo }),
      ...(isActive !== undefined && { isActive }),
      nextDueAt,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  await prisma.maintenanceItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
