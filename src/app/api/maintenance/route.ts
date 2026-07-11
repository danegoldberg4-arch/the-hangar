import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateStatus, type MaintenanceItemWithStatus } from "@/lib/maintenance";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.maintenanceItem.findMany({
    where: { isActive: true },
    include: {
      logs: {
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const itemsWithStatus: MaintenanceItemWithStatus[] = items.map((item) => {
    const { status, daysUntilDue } = calculateStatus(
      item.intervalDays,
      item.lastCompletedAt,
      item.nextDueAt
    );
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      intervalDays: item.intervalDays,
      intervalLabel: item.intervalLabel,
      parts: item.parts,
      notes: item.notes,
      assignedTo: item.assignedTo,
      lastCompletedAt: item.lastCompletedAt,
      nextDueAt: item.nextDueAt,
      isActive: item.isActive,
      status,
      daysUntilDue,
    };
  });

  itemsWithStatus.sort((a, b) => {
    const order = { overdue: 0, due_soon: 1, no_history: 2, as_needed: 3, upcoming: 4 };
    return order[a.status] - order[b.status];
  });

  return NextResponse.json(itemsWithStatus);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { name, category, description, intervalDays, intervalLabel, parts, notes, assignedTo } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  const item = await prisma.maintenanceItem.create({
    data: {
      name,
      category,
      description: description || "",
      intervalDays: intervalDays || 0,
      intervalLabel: intervalLabel || "As needed",
      parts: parts || "[]",
      notes: notes || "",
      assignedTo: assignedTo || "",
      nextDueAt: null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
