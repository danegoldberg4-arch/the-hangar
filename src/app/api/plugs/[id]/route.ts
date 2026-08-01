import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validatePlugInventoryCreate } from "@/lib/plug-inventory-validation";
import { setDevicePower } from "@/lib/integrations/tapo";
import { parseAutomation, serializeAutomation } from "@/lib/plugs";

export async function GET() {
  try {
    const plugs = await prisma.smartPlug.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(plugs);
  } catch (error) {
    return internalError("list plugs", error);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validatePlugInventoryCreate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const plug = await prisma.smartPlug.create({
      data: parsed.value,
    });
    return NextResponse.json(plug, { status: 201 });
  } catch (error) {
    return internalError("create plug", error);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  try {
    const plug = await prisma.smartPlug.findUnique({ where: { id } });
    if (!plug) {
      return NextResponse.json({ error: "Plug not found." }, { status: 404 });
    }

    // Handle on/off actions
    if (Object.prototype.hasOwnProperty.call(body.value, "action")) {
      const action = body.value.action;

      if (action === "toggle" || action === "turn_on" || action === "turn_off") {
        let targetOn: boolean;
        if (action === "toggle") targetOn = !plug.isOn;
        else targetOn = action === "turn_on";

        if (plug.type === "tapo") {
          const success = await setDevicePower(plug.deviceId, targetOn);
          if (!success) {
            return NextResponse.json(
              { error: "Could not control the plug. Check it's online." },
              { status: 502 }
            );
          }
        }

        const updated = await prisma.smartPlug.update({
          where: { id },
          data: { isOn: targetOn, lastSeen: new Date() },
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

    // Handle name/room edits
    const parsed = validatePlugInventoryUpdate(body.value);
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
  const { id } = await ctx.params;
  try {
    const deleted = await prisma.smartPlug.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Plug not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError("delete plug", error);
  }
}

function validatePlugInventoryUpdate(value: Record<string, unknown>) {
  // Simple validation — accept name and room updates
  const result: Record<string, unknown> = {};
  if (typeof value.name === "string") result.name = value.name;
  if (typeof value.room === "string") result.room = value.room;
  return { ok: true, value: result };
}
