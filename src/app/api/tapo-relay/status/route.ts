import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidBearerToken } from "@/lib/bearer-auth";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const token = process.env.INGEST_TOKEN;
  

  if (!hasValidBearerToken(request, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const plugs = body.plugs || [];

    // Update plug states in DB
    for (const plug of plugs) {
      const existing = await prisma.smartPlug.findFirst({
        where: { deviceId: plug.deviceId },
      });

      if (existing) {
        await prisma.smartPlug.update({
          where: { id: existing.id },
          data: {
            isOn: plug.isOn,
            powerW: plug.powerW || 0,
            lastSeen: new Date(),
            ...(plug.name && { name: plug.name }),
          },
        });
      } else {
        await prisma.smartPlug.create({
          data: {
            name: plug.name || `Plug ${plug.deviceId.slice(-4)}`,
            type: "tapo",
            deviceId: plug.deviceId,
            isOn: plug.isOn,
            powerW: plug.powerW || 0,
          },
        });
      }
    }

    // Check for pending commands
    // Commands are stored as SystemStatus with system = "tapo_command_{deviceId}"
    const pendingCommands = await prisma.systemStatus.findMany({
      where: {
        system: { startsWith: "tapo_command_" },
      },
      orderBy: { recordedAt: "asc" },
    });

    const commands = pendingCommands.map((c) => {
      const data = JSON.parse(c.data);
      return { deviceId: data.deviceId, action: data.action };
    });

    // Clear pending commands
    if (pendingCommands.length > 0) {
      await prisma.systemStatus.deleteMany({
        where: {
          id: { in: pendingCommands.map((c) => c.id) },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      commands,
      synced: plugs.length,
    });
  } catch (error) {
    console.error("[tapo-relay] Status sync error:", error);
    return NextResponse.json({ ok: false, error: "sync failed" }, { status: 500 });
  }
}
