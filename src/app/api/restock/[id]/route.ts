import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/restock/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await request.json();
  const { action } = body;

  if (action === "resolve") {
    const item = await prisma.restockItem.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedBy: access.user.name || "Unknown",
        resolvedAt: new Date(),
      },
    });
    return NextResponse.json(item);
  }

  if (action === "unresolve") {
    const item = await prisma.restockItem.update({
      where: { id },
      data: {
        isResolved: false,
        resolvedBy: null,
        resolvedAt: null,
      },
    });
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/restock/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  await prisma.restockItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
