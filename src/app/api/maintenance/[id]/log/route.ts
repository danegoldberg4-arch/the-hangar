import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { computeNextDue } from "@/lib/maintenance";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validateMaintenanceLog } from "@/lib/workflow-validation";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]/log">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateMaintenanceLog(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  const userId = access.user.id;
  const completedBy = access.user.name || "Unknown";

  try {
    const log = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT 1 AS "locked"
        FROM pg_advisory_xact_lock(
          hashtextextended(${`maintenance:${id}`}, 0)
        )
      `;

      const item = await tx.maintenanceItem.findUnique({ where: { id } });
      if (!item) return null;

      const created = await tx.maintenanceLog.create({
        data: {
          itemId: id,
          userId: userId || null,
          completedBy,
          notes: parsed.value.notes,
          partsUsed: parsed.value.partsUsed,
          completedAt: parsed.value.completedAt,
        },
      });

      const latestLog = await tx.maintenanceLog.findFirst({
        where: { itemId: id },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      });
      const scheduleDate = latestLog?.completedAt ?? parsed.value.completedAt;
      const nextDue = computeNextDue(
        scheduleDate,
        item.intervalDays
      );

      // Only the latest completion can drive the schedule. This stays correct
      // when an older entry is logged later or two completions race.
      await tx.maintenanceItem.updateMany({
        where: {
          id,
          OR: [
            { lastCompletedAt: null },
            { lastCompletedAt: { lt: scheduleDate } },
          ],
        },
        data: {
          lastCompletedAt: scheduleDate,
          nextDueAt: nextDue,
          updatedAt: new Date(),
        },
      });

      return created;
    });

    if (!log) {
      return apiError(404, "NOT_FOUND", "Maintenance item not found.");
    }
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return internalError("log maintenance completion", error);
  }
}
