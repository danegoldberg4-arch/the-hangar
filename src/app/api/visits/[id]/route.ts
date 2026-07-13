import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import {
  validateVisitDateOrder,
  validateVisitUpdate,
} from "@/lib/workflow-validation";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/visits/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateVisitUpdate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT 1 AS "locked"
        FROM pg_advisory_xact_lock(
          hashtextextended(${`visit:${id}`}, 0)
        )
      `;

      const existing = await tx.visit.findUnique({ where: { id } });
      if (!existing) return { kind: "not_found" } as const;
      if (
        access.user.role !== "admin" &&
        existing.userId !== access.user.id
      ) {
        return { kind: "forbidden" } as const;
      }

      const dateOrder = validateVisitDateOrder(
        parsed.value.startDate ?? existing.startDate,
        parsed.value.endDate ?? existing.endDate
      );
      if (!dateOrder.ok) {
        return { kind: "invalid", errors: dateOrder.errors } as const;
      }

      const visit = await tx.visit.update({
        where: { id },
        data: parsed.value,
      });
      return { kind: "updated", visit } as const;
    });

    if (result.kind === "not_found") {
      return apiError(404, "NOT_FOUND", "Visit not found.");
    }
    if (result.kind === "forbidden") {
      return apiError(403, "FORBIDDEN", "You cannot edit this visit.");
    }
    if (result.kind === "invalid") return validationError(result.errors);
    return NextResponse.json(result.visit);
  } catch (error) {
    return internalError("update visit", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/visits/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT 1 AS "locked"
        FROM pg_advisory_xact_lock(
          hashtextextended(${`visit:${id}`}, 0)
        )
      `;

      const existing = await tx.visit.findUnique({ where: { id } });
      if (!existing) return "not_found" as const;
      if (
        access.user.role !== "admin" &&
        existing.userId !== access.user.id
      ) {
        return "forbidden" as const;
      }

      await tx.visit.delete({ where: { id } });
      return "deleted" as const;
    });

    if (result === "not_found") {
      return apiError(404, "NOT_FOUND", "Visit not found.");
    }
    if (result === "forbidden") {
      return apiError(403, "FORBIDDEN", "You cannot delete this visit.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete visit", error);
  }
}
