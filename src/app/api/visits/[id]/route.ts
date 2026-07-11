import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/visits/[id]">
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  await prisma.visit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
