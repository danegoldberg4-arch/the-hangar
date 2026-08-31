import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const maxDuration = 30;


export async function GET() {
  try {
    const plugs = await prisma.smartPlug.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(plugs);
  } catch {
    return NextResponse.json([]);
  }
}
