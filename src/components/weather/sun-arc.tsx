interface SunArcProps {
  /** ISO-ish time strings like "05:23:00" (HH:MM:SS). */
  sunrise: string;
  sunset: string;
  nowMs?: number;
}

function toMinutes(t: string): number {
  const time = t.includes("T") ? (t.split("T")[1] ?? "") : t;
  const [h, m, s] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0) + (s || 0) / 60;
}

function toClock(t: string): string {
  const time = t.includes("T") ? (t.split("T")[1] ?? "") : t;
  return time.slice(0, 5);
}

/**
 * Semicircle sun path. Marker position = fraction of elapsed daylight.
 * Accepts "HH:MM:SS" or ISO datetime strings containing a "T" separator.
 */
export function SunArc({ sunrise, sunset, nowMs }: SunArcProps) {
  const riseMin = toMinutes(sunrise);
  const setMin = toMinutes(sunset);
  const span = Math.max(1, setMin - riseMin);

  // eslint-disable-next-line react-hooks/purity -- intentional: marker reflects "now"
  const now = nowMs ?? Date.now();
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes() + new Date(now).getSeconds() / 60;
  const t = Math.min(1, Math.max(0, (nowMin - riseMin) / span));

  const theta = Math.PI * (1 - t);
  const x = 60 + Math.cos(theta) * 50;
  const y = 55 - Math.sin(theta) * 50;

  return (
    <div>
      <svg viewBox="0 0 120 60" className="w-full h-auto" role="img" aria-label="Sun path">
        <path
          d="M10 55 A50 50 0 0 1 110 55"
          fill="none"
          stroke="var(--color-line-bright)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <circle cx={x} cy={y} r={4.5} className="sun-marker" fill="#fbbf24" />
        <circle cx={x} cy={y} r={9} className="sun-marker" fill="#fbbf24" opacity={0.18} />
      </svg>
      <div className="flex items-center justify-between mt-1">
        <span className="font-narrow text-[0.6rem] text-galv-dim">rise {toClock(sunrise)}</span>
        <span className="font-narrow text-[0.6rem] text-galv-dim">set {toClock(sunset)}</span>
      </div>
    </div>
  );
}
