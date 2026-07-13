import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/visits/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const existing = await prisma.visit.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    access.user.role !== "admin" &&
    existing.userId !== access.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { visitorName, startDate, endDate, notes, bringing } = body;

  const data: Record<string, unknown> = {};
  if (visitorName !== undefined) data.visitorName = visitorName.trim();
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (notes !== undefined) data.notes = notes.trim();
  if (bringing !== undefined) data.bringing = bringing.trim();

  const visit = await prisma.visit.update({ where: { id }, data });
  return NextResponse.json(visit);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/visits/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const existing = await prisma.visit.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    access.user.role !== "admin" &&
    existing.userId !== access.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
