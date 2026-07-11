import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function RestockSummary() {
  const items = await prisma.restockItem.findMany({
    where: { isResolved: false },
    orderBy: { addedAt: "desc" },
    take: 5,
  });

  const count = items.length;

  return (
    <div className="card-surface p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-iron" />
          Restock List
        </h3>
        <Link
          href="/restock"
          className="font-narrow uppercase tracking-wider text-xs text-iron hover:text-iron-lt transition-colors"
        >
          {count > 0 ? `${count} needed →` : "View all →"}
        </Link>
      </div>
      {count === 0 ? (
        <p className="text-sm text-galv-dim">Everything&apos;s stocked. Nothing needed right now.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-iron flex-none" />
              <span className="text-paper truncate">{item.name}</span>
              {item.note && (
                <span className="text-galv-dim text-xs truncate hidden sm:inline">— {item.note}</span>
              )}
              <span className="ml-auto font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim flex-none">
                {item.addedBy}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
