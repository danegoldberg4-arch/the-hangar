import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const threeMonthsAhead = new Date(now);
  threeMonthsAhead.setMonth(now.getMonth() + 3);

  const visits = await prisma.visit.findMany({
    where: {
      OR: [
        { startDate: { gte: threeMonthsAgo, lte: threeMonthsAhead } },
        { endDate: { gte: threeMonthsAgo, lte: threeMonthsAhead } },
      ],
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(visits);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { visitorName, startDate, endDate, notes, bringing } = body;

  if (!visitorName?.trim() || !startDate || !endDate) {
    return NextResponse.json(
      { error: "visitorName, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return NextResponse.json(
      { error: "End date must be after start date" },
      { status: 400 }
    );
  }

  const visit = await prisma.visit.create({
    data: {
      userId: (session.user as { id?: string }).id || null,
      visitorName: visitorName.trim(),
      startDate: start,
      endDate: end,
      notes: notes?.trim() || "",
      bringing: bringing?.trim() || "",
    },
  });

  return NextResponse.json(visit, { status: 201 });
}
