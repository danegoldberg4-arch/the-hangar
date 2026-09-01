interface PowerFlowProps {
  solarW: number;
  loadW: number;
}

/**
 * Animated solar → house energy flow. Dashes march in the direction of power.
 * Degrades to a single muted pulse when there's no generation (night).
 */
export function PowerFlow({ solarW, loadW }: PowerFlowProps) {
  const generating = solarW > 25;
  const solarLabel = solarW >= 1000 ? `${(solarW / 1000).toFixed(1)}kW` : `${Math.round(solarW)}W`;
  const loadLabel = loadW >= 1000 ? `${(loadW / 1000).toFixed(1)}kW` : `${Math.round(loadW)}W`;

  return (
    <div aria-label={`Solar ${solarLabel} powering ${loadLabel} of load`}>
      <svg viewBox="0 0 220 36" className="w-full" role="img" aria-hidden="true">
        {/* Left: sun glyph */}
        <g transform="translate(14 18)" className={generating ? "text-amber-400 animate-float" : "text-galv-dim"}>
          <circle r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          {[-40, -80, 0, 40, 80, 130, 160, 200, 230, 300].map((deg) => (
            <line
              key={deg}
              x1={Math.cos((deg * Math.PI) / 180) * 8}
              y1={Math.sin((deg * Math.PI) / 180) * 8}
              x2={Math.cos((deg * Math.PI) / 180) * 10}
              y2={Math.sin((deg * Math.PI) / 180) * 10}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}
        </g>
        {/* Flow line */}
        <path
          d="M30 18 H190"
          fill="none"
          stroke={generating ? "var(--color-iron-lt)" : "var(--color-steel-4)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          className={generating ? "flow-line" : undefined}
          strokeDasharray={generating ? undefined : "6 6"}
        />
        {/* Right: house glyph */}
        <g transform="translate(204 18)" className={generating ? "text-paper" : "text-galv-dim"}>
          <path d="M-8 2 L0 -6 L8 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-6" y="2" width="12" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </svg>
      <div className="flex items-baseline justify-between px-1">
        <div>
          <span className={`font-narrow font-bold text-lg ${generating ? "text-amber-400" : "text-galv-dim"}`}>{solarLabel}</span>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-1">Solar</span>
        </div>
        <div>
          <span className="font-narrow font-bold text-lg text-paper">{loadLabel}</span>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-1">Load</span>
        </div>
      </div>
    </div>
  );
}
