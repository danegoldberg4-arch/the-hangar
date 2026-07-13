import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validateRestockAction } from "@/lib/workflow-validation";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/restock/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateRestockAction(body.value);
  if (!parsed.ok) return validationError(parsed.errors);
  const resolvedBy = access.user.name || "Unknown";

  try {
    const item = await prisma.$transaction(async (tx) => {
      await tx.restockItem.updateMany({
        where: {
          id,
          isResolved: parsed.value === "unresolve",
        },
        data:
          parsed.value === "resolve"
            ? {
                isResolved: true,
                resolvedBy,
                resolvedAt: new Date(),
              }
            : {
                isResolved: false,
                resolvedBy: null,
                resolvedAt: null,
              },
      });

      return tx.restockItem.findUnique({ where: { id } });
    });

    if (!item) {
      return apiError(404, "NOT_FOUND", "Restock item not found.");
    }
    return NextResponse.json(item);
  } catch (error) {
    return internalError("update restock item", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/restock/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  try {
    const deleted = await prisma.restockItem.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return apiError(404, "NOT_FOUND", "Restock item not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete restock item", error);
  }
}
