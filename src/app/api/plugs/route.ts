import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import {
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validatePlugInventoryCreate } from "@/lib/plug-inventory-validation";

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
