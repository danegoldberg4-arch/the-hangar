import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDue } from "@/lib/maintenance";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validateMaintenanceUpdate } from "@/lib/workflow-validation";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  try {
    const item = await prisma.maintenanceItem.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { completedAt: "desc" },
        },
      },
    });

    if (!item) {
      return apiError(404, "NOT_FOUND", "Maintenance item not found.");
    }

    return NextResponse.json(item);
  } catch (error) {
    return internalError("get maintenance item", error);
  }
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateMaintenanceUpdate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const item = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT 1 AS "locked"
        FROM pg_advisory_xact_lock(
          hashtextextended(${`maintenance:${id}`}, 0)
        )
      `;

      const existing = await tx.maintenanceItem.findUnique({ where: { id } });
      if (!existing) return null;

      const { nextDueAt: overrideDueAt, ...updates } = parsed.value;
      const scheduleUpdate: { nextDueAt?: Date | null } = {};
      const hasDueOverride = Object.prototype.hasOwnProperty.call(
        parsed.value,
        "nextDueAt"
      );

      if (hasDueOverride) {
        scheduleUpdate.nextDueAt = overrideDueAt ?? null;
      } else if (updates.intervalDays !== undefined) {
        if (updates.intervalDays === 0) {
          scheduleUpdate.nextDueAt = null;
        } else if (existing.lastCompletedAt) {
          scheduleUpdate.nextDueAt = computeNextDue(
            existing.lastCompletedAt,
            updates.intervalDays
          );
        }
      }

      return tx.maintenanceItem.update({
        where: { id },
        data: {
          ...updates,
          ...scheduleUpdate,
          updatedAt: new Date(),
        },
      });
    });

    if (!item) {
      return apiError(404, "NOT_FOUND", "Maintenance item not found.");
    }
    return NextResponse.json(item);
  } catch (error) {
    return internalError("update maintenance item", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/maintenance/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  try {
    const deleted = await prisma.maintenanceItem.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return apiError(404, "NOT_FOUND", "Maintenance item not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete maintenance item", error);
  }
}
