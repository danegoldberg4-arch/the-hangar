import { prisma } from "@/lib/prisma";
import {
  fetchFireDanger,
  fetchWeatherWarnings,
  getLatestFireDanger,
} from "@/lib/integrations/weather";
import { getLatestPower, fetchPowerData } from "@/lib/integrations/selectlive";
import { fetchSunTimes, fetchCurrentWeather, getWeatherLabel } from "@/lib/integrations/forecast";
import {
  FRESHNESS_THRESHOLDS,
  freshnessLabel,
  storedObservationMeta,
  unavailableMeta,
} from "@/lib/integrations/freshness";
import { WeatherIcon } from "@/components/weather/weather-icon";

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

function windDirToText(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export async function MonitoringPanel() {
  const [existingFdr, existingPower, starlink] = await Promise.all([
    getLatestFireDanger(),
    getLatestPower(),
    prisma.starlinkStatus.findFirst({
      where: { sourceTimestampTrusted: true },
      orderBy: { observedAt: "desc" },
    }),
  ]);

  const [freshFdr, warningResult, freshPower, sunTimes, currentWeather] = await Promise.all([
    existingFdr?.freshness !== "live" ? fetchFireDanger() : Promise.resolve(null),
    fetchWeatherWarnings(),
    existingPower?.freshness !== "live" ? fetchPowerData() : Promise.resolve(null),
    fetchSunTimes(),
    fetchCurrentWeather(),
  ]);

  const warnings = warningResult ?? [];
  const fireDanger = freshFdr ?? existingFdr;
  const power = freshPower ?? existingPower;
  const generatorRunning = power?.freshness === "live" && power.genRunning;
  const fdr = fireDanger ? fireDangerConfig[fireDanger.dangerToday] || fireDangerConfig.NONE : null;
  const starlinkFreshness = starlink
    ? storedObservationMeta(
        starlink.observedAt,
        FRESHNESS_THRESHOLDS.starlink,
        starlink.sourceTimestampTrusted
      )
    : unavailableMeta();
  const starlinkState =
    starlinkFreshness.freshness === "live"
      ? starlink?.connected
        ? "online"
        : "offline"
      : starlinkFreshness.freshness;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* Power */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${power?.freshness === "live" ? "bg-amber-400 glow-dot text-amber-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Power</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${power?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
            {freshnessLabel(power ?? unavailableMeta())}
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
          </div>
        ) : (
          <p className="text-xs text-galv-dim leading-relaxed">
            Power telemetry is unavailable.
          </p>
        )}
      </div>

      {/* Generator */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${generatorRunning ? "bg-amber-400 glow-dot text-amber-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Generator</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${power?.freshness === "live" && power.genRunning ? "text-amber-400" : "text-galv-dim"}`}>
            {power ? (power.freshness === "live" ? (power.genRunning ? "running" : "standby") : "stale data") : "unavailable"}
          </span>
        </div>
        {power ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${generatorRunning ? "bg-amber-950/40 border border-amber-700/40" : "bg-steel-3 border border-line"}`}>
                <svg viewBox="0 0 24 24" className={`w-6 h-6 ${generatorRunning ? "text-amber-400" : "text-galv-dim"}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path d="M7 10v4M11 10v4M15 10v4M19 10v4" />
                </svg>
              </div>
              <div className={`font-narrow font-bold text-xl ${generatorRunning ? "text-amber-400" : "text-galv"}`}>
                {power.freshness === "live"
                  ? power.genRunning
                    ? "Running"
                    : "Standby"
                  : power.genRunning
                    ? "Last report: on"
                    : "Last report: off"}
              </div>
            </div>
            {generatorRunning && (
              <>
                <div className="h-px bg-line" />
                <div className="flex items-center-baseline gap-1">
                  <span className="font-narrow font-bold text-2xl text-amber-400">{formatPower(Math.abs(power.gridW))}</span>
                  <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim ml-auto">Output</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim leading-relaxed">
            Connect select.live to see generator status.
          </p>
        )}
      </div>

      {/* Weather */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${currentWeather?.freshness === "live" ? "bg-sky-400 glow-dot text-sky-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Weather</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${currentWeather?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
            {freshnessLabel(currentWeather ?? unavailableMeta())}
          </span>
        </div>
        {currentWeather ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-amber-400 w-8 h-8 flex-none">
                <WeatherIcon code={currentWeather.weatherCode} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-narrow font-bold text-3xl text-paper">
                  {currentWeather.temp.toFixed(0)}
                </span>
                <span className="font-narrow text-sm text-galv-dim">°C</span>
              </div>
              <span className="font-narrow text-xs text-galv ml-auto">
                {getWeatherLabel(currentWeather.weatherCode)}
              </span>
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-3 gap-2 sm:gap-2">
              <div className="min-w-0">
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">{currentWeather.humidity}%</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Humidity</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">
                  {currentWeather.windSpeed.toFixed(0)}
                  <span className="text-xs text-galv-dim ml-0.5">km/h</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">{windDirToText(currentWeather.windDir)}</div>
              </div>
              <div>
                <div className="font-narrow font-bold text-sm sm:text-base text-galv">{currentWeather.precipitation.toFixed(1)}mm</div>
                <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">Rain</div>
              </div>
            </div>
            {sunTimes && (
              <>
                <div className="h-px bg-line" />
                <div className="flex items-center justify-between">
                  <span className="font-narrow text-galv-dim flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
                    </svg>
                    <span className="text-paper text-sm">{sunTimes.sunrise.split("T")[1]}</span>
                  </span>
                  <span className="font-narrow text-galv-dim flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-iron-lt" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    <span className="text-paper text-sm">{sunTimes.sunset.split("T")[1]}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Weather observations are unavailable.</p>
        )}
      </div>

      {/* Fire Danger */}
      <div className="card-surface p-4 sm:p-5 fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${fireDanger?.freshness === "live" ? `${fdr?.dot || "bg-galv-dim"} glow-dot` : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Fire Danger</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${fireDanger?.freshness === "live" ? "text-green-400" : "text-galv-dim"}`}>
            {freshnessLabel(fireDanger ?? unavailableMeta())}
          </span>
        </div>
        {fdr && fireDanger ? (
          <div className="space-y-3">
            <div>
              <div className={`font-narrow font-bold text-2xl ${fdr.color}`}>
                {fdr.label}
              </div>
              <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim mt-0.5">
                {fireDanger.freshness === "live" ? "Today" : "Last report"}
              </div>
            </div>
            <div className="h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
                {fireDanger.freshness === "live" ? "Tomorrow" : "Next day in report"}
              </span>
              <span className={`font-narrow uppercase tracking-wider text-xs font-bold ${fireDangerConfig[fireDanger.dangerTomorrow]?.color || "text-galv"}`}>
                {fireDangerConfig[fireDanger.dangerTomorrow]?.label || fireDanger.dangerTomorrow}
              </span>
            </div>
            {fireDanger.fireBanToday && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                <span className="font-narrow uppercase tracking-wider text-[0.6rem]">
                  {fireDanger.freshness === "live" ? "Total Fire Ban Today" : "Last report indicated a total fire ban"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-galv-dim">Fire danger data is unavailable.</p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="card-surface p-4 sm:p-5 border-amber-900/30">
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

      {warningResult === null && (
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-galv-dim" />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Warnings</h3>
          </div>
          <p className="text-xs text-galv-dim">Warning feed unavailable.</p>
        </div>
      )}

      {/* Starlink */}
      <div className={`card-surface p-4 sm:p-5 fade-in ${warnings.length === 0 ? "sm:col-span-1" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${starlinkState === "online" ? "bg-green-400 glow-dot text-green-400" : "bg-galv-dim"}`} />
            <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Starlink</h3>
          </div>
          <span className={`font-narrow uppercase tracking-wider text-[0.55rem] ${starlinkState === "online" ? "text-green-400" : "text-galv-dim"}`}>
            {starlinkFreshness.freshness === "live" ? starlinkState : freshnessLabel(starlinkFreshness)}
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
            Starlink telemetry is unavailable.
          </p>
        )}
      </div>
    </div>
  );
}
