export type MaintenanceStatus =
  | "overdue"
  | "due_soon"
  | "upcoming"
  | "as_needed"
  | "no_history";

export interface MaintenanceItemWithStatus {
  id: string;
  name: string;
  category: string;
  description: string;
  intervalDays: number;
  intervalLabel: string;
  parts: string;
  notes: string;
  assignedTo: string;
  lastCompletedAt: Date | null;
  nextDueAt: Date | null;
  isActive: boolean;
  status: MaintenanceStatus;
  daysUntilDue: number | null;
}

export function calculateStatus(
  intervalDays: number,
  lastCompletedAt: Date | null,
  nextDueAt: Date | null
): { status: MaintenanceStatus; daysUntilDue: number | null } {
  if (intervalDays === 0 && !nextDueAt) {
    return { status: "as_needed", daysUntilDue: null };
  }

  if (!nextDueAt) {
    return { status: "no_history", daysUntilDue: null };
  }

  const now = new Date();
  const diffMs = nextDueAt.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return { status: "overdue", daysUntilDue: daysUntil };
  }

  if (daysUntil <= 30) {
    return { status: "due_soon", daysUntilDue: daysUntil };
  }

  return { status: "upcoming", daysUntilDue: daysUntil };
}

export function computeNextDue(
  lastCompletedAt: Date,
  intervalDays: number
): Date | null {
  if (intervalDays === 0) return null;
  const next = new Date(lastCompletedAt);
  next.setDate(next.getDate() + intervalDays);
  return next;
}

export const statusConfig: Record<
  MaintenanceStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  overdue: {
    label: "Overdue",
    color: "text-iron",
    bgColor: "bg-iron/5",
    borderColor: "border-iron/20",
  },
  due_soon: {
    label: "Due Soon",
    color: "text-iron-lt",
    bgColor: "bg-iron/5",
    borderColor: "border-iron/15",
  },
  upcoming: {
    label: "Upcoming",
    color: "text-green-400",
    bgColor: "bg-green-950/20",
    borderColor: "border-green-900/30",
  },
  as_needed: {
    label: "As Needed",
    color: "text-galv-dim",
    bgColor: "bg-steel-2",
    borderColor: "border-line",
  },
  no_history: {
    label: "Not Started",
    color: "text-galv",
    bgColor: "bg-steel-2",
    borderColor: "border-line",
  },
};

export const categoryConfig: Record<
  string,
  { label: string; icon: string }
> = {
  water: { label: "Water", icon: "water" },
  power: { label: "Power", icon: "bolt" },
  generator: { label: "Generator", icon: "generator" },
  gas: { label: "Gas", icon: "flame" },
  wastewater: { label: "Wastewater", icon: "sewage" },
  pool: { label: "Pool", icon: "pool" },
  internet: { label: "Internet", icon: "wifi" },
  grounds: { label: "Grounds", icon: "tree" },
  general: { label: "General", icon: "wrench" },
};
