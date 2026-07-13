import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const items = await prisma.restockItem.findMany({
    where: { isResolved: false },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const body = await request.json();
  const { name, note, category } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const item = await prisma.restockItem.create({
    data: {
      name: name.trim(),
      note: note?.trim() || "",
      category: category?.trim() || "general",
      addedBy: access.user.name || "Unknown",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
