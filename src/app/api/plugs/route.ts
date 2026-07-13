import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api-auth";

export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const plugs = await prisma.smartPlug.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(plugs);
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const body = await request.json();
  const { name, type, deviceId, ip, room } = body;

  if (!name || !deviceId) {
    return NextResponse.json(
      { error: "name and deviceId are required" },
      { status: 400 }
    );
  }

  const plug = await prisma.smartPlug.create({
    data: {
      name,
      type: type || "tapo",
      deviceId,
      ip: ip || "",
      room: room || "",
    },
  });

  return NextResponse.json(plug, { status: 201 });
}
