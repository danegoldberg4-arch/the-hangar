import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedItems } from "@/lib/seed-data";
import { computeNextDue } from "@/lib/maintenance";
import { requireAdmin } from "@/lib/api-auth";

export async function POST() {
  const access = await requireAdmin();
  if (!access.ok) return access.response;

  const existing = await prisma.maintenanceItem.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Database already seeded. Clear it first to reseed." },
      { status: 400 }
    );
  }

  const created = [];
  for (const item of seedItems) {
    const record = await prisma.maintenanceItem.create({
      data: {
        ...item,
        nextDueAt: null,
      },
    });
    created.push(record);
  }

  const overdueItem = await prisma.maintenanceItem.findFirst({
    where: { name: "UV water lamp" },
  });

  if (overdueItem) {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const nextDue = computeNextDue(oldDate, overdueItem.intervalDays);
    await prisma.maintenanceItem.update({
      where: { id: overdueItem.id },
      data: {
        lastCompletedAt: oldDate,
        nextDueAt: nextDue,
        notes:
          overdueItem.notes +
          " | RIGHT NOW: the Puretec UV unit is beeping — the lamp is overdue. Silence 7 days (hold power until 'delay'), order RL6 + cartridges, fit, then hold power ~15s to reset.",
      },
    });
  }

  return NextResponse.json({
    message: `Seeded ${created.length} maintenance items`,
    count: created.length,
  });
}
