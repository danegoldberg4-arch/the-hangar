import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateStatus, statusConfig, categoryConfig } from "@/lib/maintenance";
import { LogForm } from "@/components/maintenance/log-form";
import { EditForm } from "@/components/maintenance/edit-form";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const item = await prisma.maintenanceItem.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!item) notFound();

  const { status, daysUntilDue } = calculateStatus(
    item.intervalDays,
    item.lastCompletedAt,
    item.nextDueAt
  );

  const s = statusConfig[status];
  const cat = categoryConfig[item.category] || categoryConfig.general;

  let parsedParts: { name: string; partNumber?: string }[] = [];
  try {
    parsedParts = JSON.parse(item.parts);
  } catch {
    // ignore
  }

  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-8 w-full overflow-x-hidden py-8 sm:py-12">
      <Link
        href="/maintenance"
        className="font-narrow uppercase tracking-wider text-xs text-galv hover:text-iron-lt transition-colors mb-4 inline-block"
      >
        ← Back to maintenance
      </Link>

      {/* Header */}
      <div className={`border ${s.borderColor} ${s.bgColor} rounded-lg p-6 mb-6`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-narrow uppercase tracking-wider text-xs text-iron">
            {cat.label}
          </span>
          <span className={`font-narrow uppercase tracking-wider text-[0.65rem] font-bold ${s.color}`}>
            {s.label}
          </span>
        </div>
        <h1 className="font-narrow font-bold uppercase text-2xl sm:text-3xl tracking-tight text-paper">
          {item.name}
        </h1>
        {daysUntilDue !== null && (
          <div className={`font-narrow font-bold text-lg mt-2 ${s.color}`}>
            {daysUntilDue < 0
              ? `${Math.abs(daysUntilDue)} days overdue`
              : `Due in ${daysUntilDue} days`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-surface p-4 sm:p-6">
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-3">
              Details
            </h2>
            <p className="text-paper text-sm leading-relaxed mb-4">{item.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim">
                  Interval
                </dt>
                <dd className="text-paper mt-0.5">{item.intervalLabel}</dd>
              </div>
              <div>
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim">
                  Assigned to
                </dt>
                <dd className="text-paper mt-0.5">{item.assignedTo || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim">
                  Last completed
                </dt>
                <dd className="text-paper mt-0.5">
                  {item.lastCompletedAt
                    ? new Date(item.lastCompletedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Never"}
                </dd>
              </div>
              <div>
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim">
                  Next due
                </dt>
                <dd className="text-paper mt-0.5">
                  {item.nextDueAt
                    ? new Date(item.nextDueAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Not scheduled"}
                </dd>
              </div>
            </div>

            {parsedParts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line">
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim mb-2">
                  Parts
                </dt>
                <div className="flex flex-wrap gap-2">
                  {parsedParts.map((part, i) => (
                    <span
                      key={i}
                      className="font-narrow text-xs bg-steel-3 text-sand px-2 py-1 rounded tracking-wide"
                    >
                      {part.name}
                      {part.partNumber && ` · ${part.partNumber}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.notes && (
              <div className="mt-4 pt-4 border-t border-line">
                <dt className="font-narrow uppercase tracking-wider text-[0.65rem] text-galv-dim mb-1">
                  Notes
                </dt>
                <dd className="text-galv text-sm leading-relaxed">{item.notes}</dd>
              </div>
            )}
          </div>

          {/* Logbook History */}
          <div className="card-surface p-4 sm:p-6">
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-4">
              Logbook History ({item.logs.length})
            </h2>
            {item.logs.length === 0 ? (
              <p className="text-galv-dim text-sm italic">No entries yet.</p>
            ) : (
              <div className="space-y-3">
                {item.logs.map((log) => (
                  <div
                    key={log.id}
                    className="border-l-2 border-iron/30 pl-4 py-1"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-narrow uppercase tracking-wider text-xs text-iron font-bold">
                        {new Date(log.completedAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-galv">{log.completedBy}</span>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-galv-dim mt-1">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Log Form */}
        <div className="lg:col-span-1">
          <div className="card-surface p-4 sm:p-6 sticky top-20">
            <h2 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-4">
              Log Completion
            </h2>
            <LogForm itemId={item.id} parts={item.parts} userName={session?.user?.name || "Unknown"} />

            <div className="h-px bg-line my-4" />
            <h3 className="font-narrow uppercase tracking-wider text-sm font-bold text-galv mb-3">
              Edit
            </h3>
            <EditForm
              itemId={item.id}
              name={item.name}
              category={item.category}
              description={item.description}
              intervalDays={item.intervalDays}
              intervalLabel={item.intervalLabel}
              assignedTo={item.assignedTo}
              notes={item.notes}
              nextDueAt={item.nextDueAt?.toISOString() ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
