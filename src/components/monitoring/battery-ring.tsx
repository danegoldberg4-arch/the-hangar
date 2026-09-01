interface BatteryRingProps {
  /** Battery state of charge, 0–100. */
  soc: number;
  /** Diameter in px. */
  size?: number;
}

/**
 * Circular battery gauge. Pure SVG + CSS transition (no JS), so it works
 * from server or client components; animates whenever `soc` changes.
 */
export function BatteryRing({ soc, size = 92 }: BatteryRingProps) {
  const clamped = Math.min(100, Math.max(0, soc));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  const color = clamped < 30 ? "#f87171" : clamped < 60 ? "#fbbf24" : "#4ade80";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Battery ${clamped.toFixed(0)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {/* Glow track under the arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-steel-4)"
          strokeOpacity={0.5}
          strokeWidth={2}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="battery-ring"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-narrow font-bold text-xl leading-none" style={{ color }}>
          {clamped.toFixed(0)}
        </span>
        <span className="font-narrow text-[0.55rem] uppercase tracking-wider text-galv-dim leading-none mt-0.5">
          % SoC
        </span>
      </div>
    </div>
  );
}
