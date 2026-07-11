interface IconProps {
  code: number;
  className?: string;
}

export function WeatherIcon({ code, className = "w-6 h-6" }: IconProps) {
  const icon = getIconForCode(code);
  return <span className={className}>{icon}</span>;
}

function getIconForCode(code: number): React.ReactNode {
  if (code === 0) return <SunIcon />;
  if (code === 1) return <SunCloudIcon />;
  if (code === 2) return <PartlyCloudyIcon />;
  if (code === 3) return <CloudIcon />;
  if (code === 45 || code === 48) return <FogIcon />;
  if (code >= 51 && code <= 57) return <DrizzleIcon />;
  if (code >= 61 && code <= 65) return <RainIcon />;
  if (code >= 71 && code <= 77) return <SnowIcon />;
  if (code >= 80 && code <= 82) return <RainIcon />;
  if (code >= 95) return <StormIcon />;
  return <CloudIcon />;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function SunCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M2.5 8H1M15 8h-1.5M3.8 3.8l1 1M11.2 4.8l1-1" />
      <path d="M17 20a4 4 0 0 0 0-8 5 5 0 0 0-9.5 1.5A3.5 3.5 0 0 0 8 20h9z" />
    </svg>
  );
}

function PartlyCloudyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="9" cy="7" r="2.5" />
      <path d="M9 1.5v1M9 12.5v1M3.5 7h-1M14.5 7H13.5" />
      <path d="M17 21a4 4 0 0 0 0-8 5 5 0 0 0-9 2A3.5 3.5 0 0 0 9 21h8z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 18a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 18h10z" />
    </svg>
  );
}

function FogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 14a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 14h10z" />
      <path d="M4 17h16M4 20h12" />
    </svg>
  );
}

function DrizzleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 14a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 14h10z" />
      <path d="M9 17v2M13 17v2M9 20.5v.5M13 20.5v.5" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 13a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 13h10z" />
      <path d="M8 16v3M12 16v3M16 16v3M8 20v1M12 20v1M16 20v1" />
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 13a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 13h10z" />
      <path d="M8 17l1.5 2.5M12 17l0 3M16 17l-1.5 2.5M9.5 19.5l0 1M14.5 19.5l0 1" />
    </svg>
  );
}

function StormIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 13a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.5 2A4 4 0 0 0 7 13h10z" />
      <path d="M12 14l-2 4h3l-2 4" />
    </svg>
  );
}
