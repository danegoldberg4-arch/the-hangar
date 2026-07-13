import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceAdmin, requireAdmin, requireUser } from "@/lib/api-auth";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validatePlugInventoryUpdate } from "@/lib/plug-inventory-validation";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  try {
    const plug = await prisma.smartPlug.findUnique({ where: { id } });
    if (!plug) {
      return apiError(404, "NOT_FOUND", "Inventory device not found.");
    }

    if (
      Object.prototype.hasOwnProperty.call(body.value, "action") ||
      Object.prototype.hasOwnProperty.call(body.value, "automation")
    ) {
      return apiError(
        501,
        "CONTROL_UNAVAILABLE",
        "Physical device control is unavailable until the edge agent is deployed."
      );
    }

    const forbidden = enforceAdmin(access.user);
    if (forbidden) return forbidden;

    const parsed = validatePlugInventoryUpdate(body.value);
    if (!parsed.ok) return validationError(parsed.errors);

    const updated = await prisma.smartPlug.update({
      where: { id },
      data: parsed.value,
      select: {
        id: true,
        name: true,
        type: true,
        deviceId: true,
        ip: true,
        room: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return internalError("update inventory device", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  try {
    const deleted = await prisma.smartPlug.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return apiError(404, "NOT_FOUND", "Inventory device not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete inventory device", error);
  }
}
