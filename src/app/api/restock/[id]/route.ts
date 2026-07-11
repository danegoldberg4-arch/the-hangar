import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/restock/[id]">
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const { action } = body;

  if (action === "resolve") {
    const item = await prisma.restockItem.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedBy: session.user.name || "Unknown",
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  await prisma.restockItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
