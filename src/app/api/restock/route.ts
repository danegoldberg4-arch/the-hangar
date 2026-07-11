import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.restockItem.findMany({
    where: { isResolved: false },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      addedBy: session.user.name || "Unknown",
    },
  });

  return NextResponse.json(item, { status: 201 });
}
