import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import {
  internalError,
  readJsonObject,
  validationError,
} from "@/lib/api-response";
import { parseDateOnly, validateVisitCreate } from "@/lib/workflow-validation";

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const fromValue = request.nextUrl.searchParams.get("from") ?? formatUtcDate(defaultFrom);
  const toValue = request.nextUrl.searchParams.get("to") ?? formatUtcDate(defaultTo);
  const from = parseDateOnly(fromValue);
  const to = parseDateOnly(toValue);

  const rangeErrors: Record<string, string> = {};
  if (!from) rangeErrors.from = "from must be a real date in YYYY-MM-DD format.";
  if (!to) rangeErrors.to = "to must be a real date in YYYY-MM-DD format.";
  if (from && to && to < from) rangeErrors.to = "to must be on or after from.";
  if (from && to && to.getTime() - from.getTime() > 365 * 86_400_000) {
    rangeErrors.to = "The requested visit range cannot exceed 366 days.";
  }
  if (Object.keys(rangeErrors).length > 0) return validationError(rangeErrors);

  const inclusiveTo = new Date(to!);
  inclusiveTo.setUTCHours(23, 59, 59, 999);

  try {
    const visits = await prisma.visit.findMany({
      where: {
        // A visit overlaps the requested inclusive date range when it starts
        // before the range ends and ends after the range starts.
        startDate: { lte: inclusiveTo },
        endDate: { gte: from! },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(visits);
  } catch (error) {
    return internalError("list visits", error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireUser();
  if (!access.ok) return access.response;

  const body = await readJsonObject(request);
  if (!body.ok) return body.response;

  const parsed = validateVisitCreate(body.value);
  if (!parsed.ok) return validationError(parsed.errors);

  try {
    const visit = await prisma.visit.create({
      data: {
        userId: access.user.id,
        ...parsed.value,
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    return internalError("create visit", error);
  }
}
