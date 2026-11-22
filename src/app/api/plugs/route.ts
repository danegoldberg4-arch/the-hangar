import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
export const maxDuration = 30;


export async function GET() {
  const access = await requireUser();
  if (!access.ok) return access.response;

  try {
    const plugs = await prisma.smartPlug.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(plugs);
  } catch {
    return NextResponse.json([]);
  }
}
