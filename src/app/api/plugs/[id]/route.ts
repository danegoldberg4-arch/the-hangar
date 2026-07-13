import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceAdmin, requireAdmin, requireUser } from "@/lib/api-auth";
import { parseAutomation, serializeAutomation, type PlugAutomation } from "@/lib/plugs";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  const body = await request.json();
  const { action, automation, name, room } = body;

  const plug = await prisma.smartPlug.findUnique({ where: { id } });
  if (!plug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "toggle") {
    const newState = !plug.isOn;
    await prisma.smartPlug.update({
      where: { id },
      data: { isOn: newState, lastSeen: new Date() },
    });
    return NextResponse.json({ ...plug, isOn: newState });
  }

  if (action === "turn_on") {
    await prisma.smartPlug.update({
      where: { id },
      data: { isOn: true, lastSeen: new Date() },
    });
    return NextResponse.json({ ...plug, isOn: true });
  }

  if (action === "turn_off") {
    await prisma.smartPlug.update({
      where: { id },
      data: { isOn: false, lastSeen: new Date() },
    });
    return NextResponse.json({ ...plug, isOn: false });
  }

  if (automation !== undefined) {
    const forbidden = enforceAdmin(access.user);
    if (forbidden) return forbidden;

    const auto: PlugAutomation = { ...parseAutomation(plug.automation), ...automation };
    const updated = await prisma.smartPlug.update({
      where: { id },
      data: { automation: serializeAutomation(auto) },
    });
    return NextResponse.json(updated);
  }

  if (name !== undefined || room !== undefined) {
    const forbidden = enforceAdmin(access.user);
    if (forbidden) return forbidden;

    const updated = await prisma.smartPlug.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(room !== undefined && { room }),
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/plugs/[id]">
) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  await prisma.smartPlug.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
