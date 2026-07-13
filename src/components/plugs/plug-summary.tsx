import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseAutomation } from "@/lib/plugs";

export async function PlugSummary() {
  const plugs = await prisma.smartPlug.findMany({
    orderBy: { name: "asc" },
  });

  if (plugs.length === 0) return null;

  const onCount = plugs.filter((p) => p.isOn).length;
  const autoCount = plugs.filter((p) => parseAutomation(p.automation).enabled).length;

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-paper flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Plugs
        </h3>
        <Link
          href="/plugs"
          className="font-narrow uppercase tracking-wider text-xs text-iron hover:text-iron-lt transition-colors"
        >
          Manage →
        </Link>
      </div>
      <div className="space-y-1.5">
        {plugs.slice(0, 5).map((plug) => {
          const auto = parseAutomation(plug.automation);
          return (
            <div key={plug.id} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${plug.isOn ? "bg-green-400 glow-dot text-green-400" : "bg-galv-dim"}`} />
              <span className="text-paper truncate">{plug.name}</span>
              {auto.enabled && (
                <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-amber-400">auto</span>
              )}
              <span className="ml-auto font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
                {plug.isOn ? "on" : "off"}
                {plug.powerW > 0 && ` · ${plug.powerW.toFixed(0)}W`}
              </span>
            </div>
          );
        })}
        {plugs.length > 5 && (
          <div className="text-xs text-galv-dim pt-1">+{plugs.length - 5} more</div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
        <span className="font-narrow uppercase tracking-wider text-[0.6rem] text-galv-dim">
          {onCount} on · {autoCount} automated
        </span>
      </div>
    </div>
  );
}
