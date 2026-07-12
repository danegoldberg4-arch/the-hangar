import { fetchForecast, getWeatherLabel } from "@/lib/integrations/forecast";
import { WeatherIcon } from "@/components/weather/weather-icon";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function windDirToText(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatTime(iso: string): string {
  const time = iso.split("T")[1];
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

export async function ForecastWidget() {
  const forecast = await fetchForecast();

  if (!forecast) {
    return (
      <div className="card-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Forecast</h3>
        </div>
        <p className="text-xs text-galv-dim">Fetching forecast...</p>
      </div>
    );
  }

  const today = forecast.daily[0];
  const futureDays = forecast.daily.slice(1);

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <h3 className="font-narrow uppercase tracking-wider text-xs font-bold text-galv">Forecast</h3>
        </div>
        <span className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
          Upper Kangaroo River
        </span>
      </div>

      {/* Today */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-amber-400 w-10 h-10 flex-none">
          <WeatherIcon code={today.weatherCode} />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-narrow font-bold text-3xl text-paper">{today.maxTemp.toFixed(0)}°</span>
            <span className="font-narrow text-lg text-galv-dim">{today.minTemp.toFixed(0)}°</span>
          </div>
          <div className="font-narrow text-xs text-galv">{getWeatherLabel(today.weatherCode)}</div>
          {today.precipitation > 0 && (
            <div className="font-narrow text-xs text-sky-400">{today.precipitation}mm rain</div>
          )}
        </div>
      </div>

      {/* Coming days */}
      <div className="h-px bg-line mb-3" />
      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        {futureDays.map((day) => {
          const date = new Date(day.date);
          const isTomorrow = day === futureDays[0];
          return (
            <div key={day.date} className="text-center">
              <div className="font-narrow uppercase tracking-wider text-[0.55rem] text-galv-dim">
                {isTomorrow ? "Tom" : dayNames[date.getDay()]}
              </div>
              <div className="text-galv-dim w-6 h-6 mx-auto my-1">
                <WeatherIcon code={day.weatherCode} />
              </div>
              <div className="font-narrow font-bold text-base text-paper">
                {day.maxTemp.toFixed(0)}°
              </div>
              <div className="font-narrow text-[0.65rem] text-galv-dim">
                {day.minTemp.toFixed(0)}°
              </div>
              {day.precipitation > 0 && (
                <div className="font-narrow text-[0.55rem] text-sky-400 mt-0.5">
                  {day.precipitation}mm
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current conditions footer */}
      <div className="h-px bg-line mt-4 mb-3" />
      <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-narrow text-galv-dim">
            Now <span className="text-paper">{forecast.current.temp.toFixed(0)}°</span>
          </span>
          <span className="font-narrow text-galv-dim">
            <span className="text-paper">{forecast.current.humidity}%</span> hum
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-narrow text-galv-dim flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
            </svg>
            <span className="text-paper">{formatTime(forecast.sunrise)}</span>
          </span>
          <span className="font-narrow text-galv-dim flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-iron-lt" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span className="text-paper">{formatTime(forecast.sunset)}</span>
          </span>
        </div>
        <span className="font-narrow text-galv-dim w-full">
          <span className="text-paper">{forecast.current.windSpeed.toFixed(0)}</span>km/h {windDirToText(forecast.current.windDir)}
        </span>
      </div>
    </div>
  );
}
