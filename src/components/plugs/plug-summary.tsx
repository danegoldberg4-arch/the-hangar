import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function PlugSummary() {
  let deviceCount = 0;
  let failed = false;
  try {
    deviceCount = await prisma.smartPlug.count();
  } catch (err) {
    console.error("[plug-summary] DB error:", err);
    failed = true;
  }
  if (failed || deviceCount === 0) return null;

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-galv-dim" />
          Device inventory
        </h3>
        <Link href="/plugs" className="font-narrow uppercase tracking-wider text-xs text-iron hover:text-iron-lt">
          View
        </Link>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-narrow font-bold text-2xl text-paper">{deviceCount}</span>
        <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
          recorded · control unavailable
        </span>
      </div>
    </div>
  );
}
