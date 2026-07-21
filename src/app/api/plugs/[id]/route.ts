import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceAdmin, requireUser } from "@/lib/api-auth";
import {
  apiError,
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validatePlugInventoryUpdate } from "@/lib/plug-inventory-validation";
import { setDevicePower, getDevicePower } from "@/lib/integrations/tapo";
import { parseAutomation, serializeAutomation } from "@/lib/plugs";

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
      return apiError(404, "NOT_FOUND", "Plug not found.");
    }

    // Handle on/off actions — calls the real Tapo API
    if (Object.prototype.hasOwnProperty.call(body.value, "action")) {
      const action = body.value.action;

      if (action === "toggle" || action === "turn_on" || action === "turn_off") {
        let targetOn: boolean;
        if (action === "toggle") targetOn = !plug.isOn;
        else targetOn = action === "turn_on";

        // Call Tapo API to control the physical plug
        if (plug.type === "tapo") {
          const success = await setDevicePower(plug.deviceId, targetOn);
          if (!success) {
            return apiError(502, "DEVICE_ERROR", "Could not control the plug. Check it's online.");
          }
        }

        // Also fetch current power reading
        let powerW = plug.powerW;
        if (plug.type === "tapo") {
          const power = await getDevicePower(plug.deviceId);
          if (power) powerW = power;
        }

        const updated = await prisma.smartPlug.update({
          where: { id },
          data: { isOn: targetOn, powerW, lastSeen: new Date() },
        });
        return NextResponse.json(updated);
      }
    }

    // Handle automation settings
    if (Object.prototype.hasOwnProperty.call(body.value, "automation")) {
      const auto = { ...parseAutomation(plug.automation), ...(body.value.automation as Record<string, unknown>) };
      const updated = await prisma.smartPlug.update({
        where: { id },
        data: { automation: serializeAutomation(auto) },
      });
      return NextResponse.json(updated);
    }

    // Handle name/room edits (admin only)
    const forbidden = enforceAdmin(access.user);
    if (forbidden) return forbidden;

    const parsed = validatePlugInventoryUpdate(body.value);
    if (!parsed.ok) return validationError(parsed.errors);

    const updated = await prisma.smartPlug.update({
      where: { id },
      data: parsed.value,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return internalError("update plug", error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const forbidden = enforceAdmin(access.user);
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  try {
    const deleted = await prisma.smartPlug.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return apiError(404, "NOT_FOUND", "Plug not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete plug", error);
  }
}
