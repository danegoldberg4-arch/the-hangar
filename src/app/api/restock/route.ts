import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import {
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { validateRestockCreate } from "@/lib/workflow-validation";

export async function GET(request: NextRequest) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const includeResolvedValue = request.nextUrl.searchParams.get("includeResolved");
  if (
    includeResolvedValue !== null &&
    includeResolvedValue !== "true" &&
    includeResolvedValue !== "false"
  ) {
    return validationError({ includeResolved: "includeResolved must be true or false." });
  }
  const includeResolved = includeResolvedValue === "true";

  const limitValue = request.nextUrl.searchParams.get("resolvedLimit");
  const resolvedLimit = limitValue === null ? 20 : Number(limitValue);
  if (!Number.isInteger(resolvedLimit) || resolvedLimit < 1 || resolvedLimit > 50) {
    return validationError({
      resolvedLimit: "resolvedLimit must be a whole number from 1 to 50.",
    });
  }

  try {
    const { active, resolved } = await prisma.$transaction(
      async (tx) => {
        const activeItems = await tx.restockItem.findMany({
          where: { isResolved: false },
          orderBy: { addedAt: "desc" },
        });
        const resolvedItems = includeResolved
          ? await tx.restockItem.findMany({
              where: { isResolved: true },
              orderBy: { resolvedAt: "desc" },
              take: resolvedLimit,
            })
          : [];

        return { active: activeItems, resolved: resolvedItems };
      },
      { isolationLevel: "RepeatableRead" }
    );

    return NextResponse.json([...active, ...resolved]);
  } catch (error) {
    return internalError("list restock items", error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateRestockCreate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const item = await prisma.restockItem.create({
      data: {
        ...parsed.value,
        addedBy: access.user.name || "Unknown",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return internalError("create restock item", error);
  }
}
