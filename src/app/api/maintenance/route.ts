import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import { calculateStatus, type MaintenanceItemWithStatus } from "@/lib/maintenance";
import {
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validateMaintenanceCreate } from "@/lib/workflow-validation";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  try {
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
  } catch (error) {
    return internalError("list maintenance items", error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateMaintenanceCreate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const item = await prisma.maintenanceItem.create({
      data: {
        ...parsed.value,
        nextDueAt: null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return internalError("create maintenance item", error);
  }
}
