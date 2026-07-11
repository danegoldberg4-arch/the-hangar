import { prisma } from "@/lib/prisma";
import {
  fetchWeatherObservation,
  fetchFireDanger,
  fetchWeatherWarnings,
  getLatestWeather,
  getLatestFireDanger,
} from "@/lib/integrations/weather";
import { getLatestPower } from "@/lib/integrations/selectlive";

const fireDangerConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NONE: { label: "None", color: "text-galv-dim", bg: "bg-steel-2", dot: "bg-galv-dim" },
  MODERATE: { label: "Moderate", color: "text-green-400", bg: "bg-green-950/30", dot: "bg-green-500" },
  HIGH: { label: "High", color: "text-amber-400", bg: "bg-amber-950/30", dot: "bg-amber-500" },
  EXTREME: { label: "Extreme", color: "text-red-400", bg: "bg-red-950/30", dot: "bg-red-500" },
  CATASTROPHIC: { label: "Catastrophic", color: "text-red-300", bg: "bg-red-950/50", dot: "bg-red-400" },
};

function formatPower(w: number): string {
  if (Math.abs(w) >= 1000) return `${(w / 1000).toFixed(1)}kW`;
  return `${Math.round(w)}W`;
}

const STALE_THRESHOLD_MIN = 15;

export async function MonitoringPanel() {
  const now = new Date();
  const [existingWeather, existingFdr, power, starlink] = await Promise.all([
    prisma.weatherData.findFirst({ orderBy: { recordedAt: "desc" } }),
    prisma.fireDanger.findFirst({ orderBy: { recordedAt: "desc" }, where: { district: "Illawarra/Shoalhaven" } }),
    getLatestPower(),
    prisma.starlinkStatus.findFirst({ orderBy: { recordedAt: "desc" } }),
  ]);

  const weatherStale =
    !existingWeather ||
    (now.getTime() - existingWeather.recordedAt.getTime()) / 60000 > STALE_THRESHOLD_MIN;
  const fdrStale =
    !existingFdr ||
    (now.getTime() - existingFdr.recordedAt.getTime()) / 60000 > 60;

  const [freshWeather, freshFdr, warnings] = await Promise.all([
    weatherStale ? fetchWeatherObservation() : Promise.resolve(null),
    fdrStale ? fetchFireDanger() : Promise.resolve(null),
    fetchWeatherWarnings(),
  ]);

  const weather = freshWeather || (await getLatestWeather());
  const fireDanger = freshFdr || (await getLatestFireDanger());
  const fdr = fireDanger ? fireDangerConfig[fireDanger.dangerToday] || fireDangerConfig.NONE : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Power */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${power?.stale ? "text-galv-dim" : "text-green-400"}`}>
            {power ? (power.stale ? "stale" : "live") : "—"}
          </span>
        </div>
        {power ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className={`font-narrow font-bold text-3xl ${power.batterySoc < 30 ? "text-red-400" : power.batterySoc < 60 ? "text-amber-400" : "text-green-400"}`}>
                {power.batterySoc.toFixed(0)}
              </span>
              <span className="font-narrow text-sm text-galv-dim">%</span>
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-auto">Battery</span>
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-narrow font-bold text-lg text-amber-400">{formatPower(power.solarW)}</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Solar</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-lg text-paper">{formatPower(power.loadW)}</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Load</div>
              </div>
            </div>
            {power.genRunning && (
              <div className="flex items-center gap-2 text-amber-400">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-narrow uppercase tracking-wider text-[0.6rem]">Generator running</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim leading-relaxed">
            Set <code className="text-iron text-[0.7rem] bg-steel-3 px-1 rounded">SELECT_LIVE_*</code> env vars to connect.
          </p>
        )}
      </div>

      {/* Weather */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Weather</h3>
          </div>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
            {weather?.station || "—"}
          </span>
        </div>
        {weather ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="font-narrow font-bold text-3xl text-paper">
                {weather.airTemp !== null ? weather.airTemp.toFixed(0) : "—"}
              </span>
              <span className="font-narrow text-sm text-galv-dim">°C</span>
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-auto">
                {weather.cloud || "—"}
              </span>
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="font-narrow font-bold text-base text-galv">{weather.humidity ?? "—"}%</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Humidity</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-base text-galv">
                  {weather.windDir && weather.windSpdKmh !== null ? `${weather.windSpdKmh}` : "—"}
                  <span className="text-xs text-galv-dim ml-0.5">km/h</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">{weather.windDir || "Wind"}</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-base text-galv">{weather.rainTrace || "0.0"}mm</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Rain</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Fetching from BOM...</p>
        )}
      </div>

      {/* Fire Danger */}
      <div className={`rounded-xl border border-line p-5 ${fdr ? fdr.bg : "bg-steel-2"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${fdr?.dot || "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Fire Danger</h3>
          </div>
          <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Illawarra/Shoalhaven</span>
        </div>
        {fdr && fireDanger ? (
          <div className="space-y-3">
            <div>
              <div className={`font-narrow font-bold text-2xl ${fdr.color}`}>
                {fdr.label}
              </div>
              <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">Today</div>
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Tomorrow</span>
              <span className={`font-narrow uppercase tracking-wider text-xs font-bold ${fireDangerConfig[fireDanger.dangerTomorrow]?.color || "text-galv"}`}>
                {fireDangerConfig[fireDanger.dangerTomorrow]?.label || fireDanger.dangerTomorrow}
              </span>
            </div>
            {fireDanger.fireBanToday && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                <span className="font-narrow uppercase tracking-wider text-[0.6rem]">Total Fire Ban Today</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Fetching from RFS...</p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="card-surface p-5 border-amber-900/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">
              Warnings ({warnings.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {warnings.slice(0, 3).map((w, i) => (
              <a
                key={i}
                href={w.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-galv hover:text-paper transition-colors leading-relaxed"
              >
                {w.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Starlink */}
      <div className={`card-surface p-5 ${warnings.length === 0 ? "sm:col-span-1" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${starlink?.connected ? "bg-green-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Starlink</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${starlink?.connected ? "text-green-400" : "text-galv-dim"}`}>
            {starlink?.connected ? "online" : "offline"}
          </span>
        </div>
        {starlink ? (
          <div className="grid grid-cols-2 gap-2">
            {starlink.latencyMs !== null && (
              <div>
                <div className="font-narrow font-bold text-lg text-paper">{starlink.latencyMs?.toFixed(0)}ms</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Latency</div>
              </div>
            )}
            {starlink.downlinkThroughputBps !== null && (
              <div>
                <div className="font-narrow font-bold text-lg text-paper">
                  {((starlink.downlinkThroughputBps || 0) / 1e6).toFixed(1)}
                  <span className="text-xs text-galv-dim ml-0.5">Mbps</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Download</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim leading-relaxed">
            Waiting for Pi relay. Set <code className="text-iron text-[0.7rem] bg-steel-3 px-1 rounded">INGEST_TOKEN</code> in .env.
          </p>
        )}
      </div>
    </div>
  );
}
