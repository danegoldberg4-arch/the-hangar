import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setDevicePower } from "@/lib/integrations/tapo";
import { parseAutomation, serializeAutomation } from "@/lib/plugs";


export async function GET() {
  try {
    const plugs = await prisma.smartPlug.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(plugs);
  } catch {
    return NextResponse.json({ error: "Failed to list plugs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plug = await prisma.smartPlug.create({
      data: {
        name: body.name || "New Plug",
        type: body.type || "tapo",
        deviceId: body.deviceId || "",
        isOn: false,
        powerW: 0,
      },
    });
    return NextResponse.json(plug, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create plug" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const plug = await prisma.smartPlug.findUnique({ where: { id } });
    if (!plug) {
      return NextResponse.json({ error: "Plug not found" }, { status: 404 });
    }

    // Handle on/off actions
    if (body.action) {
      let targetOn: boolean;
      if (body.action === "toggle") targetOn = !plug.isOn;
      else targetOn = body.action === "turn_on";

      // Try cloud API first
      let cloudSuccess = false;
      if (plug.type === "tapo") {
        cloudSuccess = await setDevicePower(plug.deviceId, targetOn);
      }

      if (!cloudSuccess) {
        // Cloud failed — queue command for the local relay
        await prisma.systemStatus.create({
          data: {
            system: `tapo_command_${plug.deviceId}`,
            status: "pending",
            data: JSON.stringify({
              deviceId: plug.deviceId,
              action: targetOn ? "turn_on" : "turn_off",
            }),
          },
        });
        // Optimistically update state — relay will confirm
        const updated = await prisma.smartPlug.update({
          where: { id },
          data: { isOn: targetOn, lastSeen: new Date() },
        });
        return NextResponse.json({
          ...updated,
          pendingRelay: true,
          message: "Command queued for local relay",
        });
      }

      const updated = await prisma.smartPlug.update({
        where: { id },
        data: { isOn: targetOn, lastSeen: new Date() },
      });
      return NextResponse.json(updated);
    }

    // Handle automation settings
    if (body.automation) {
      const auto = { ...parseAutomation(plug.automation), ...body.automation };
      const updated = await prisma.smartPlug.update({
        where: { id },
        data: { automation: serializeAutomation(auto) },
      });
      return NextResponse.json(updated);
    }

    // Handle name/room edits
    const updateData: Record<string, string> = {};
    if (typeof body.name === "string") updateData.name = body.name;
    if (typeof body.room === "string") updateData.room = body.room;
    
    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.smartPlug.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update plug" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const { id } = await ctx.params;
  try {
    await prisma.smartPlug.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete plug" }, { status: 500 });
  }
}
