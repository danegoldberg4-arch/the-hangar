import {
  FRESHNESS_THRESHOLDS,
  observationMeta,
  type ObservationMeta,
} from "./freshness";
import { fetchWithTimeout } from "./http";
import { openMeteoObservedAt } from "./open-meteo";

export interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  windMax: number;
  weatherCode: number;
}

export interface CurrentWeather {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  precipitation: number;
}

export interface WeatherForecast extends ObservationMeta {
  current: CurrentWeather;
  daily: ForecastDay[];
  sunrise: string;
  sunset: string;
}

export interface CurrentConditions extends CurrentWeather, ObservationMeta {
  weatherCode: number;
}

export interface SunTimes extends ObservationMeta {
  sunrise: string;
  sunset: string;
}

const LAT = -34.73;
const LON = 150.48;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validLocalDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
  );
}

function currentWeatherFrom(value: unknown): CurrentWeather | null {
  if (!isObject(value)) return null;
  const current = value;
  if (
    !finiteNumber(current.temperature_2m) ||
    !finiteNumber(current.relative_humidity_2m) ||
    !finiteNumber(current.wind_speed_10m) ||
    !finiteNumber(current.wind_direction_10m) ||
    !finiteNumber(current.precipitation) ||
    current.relative_humidity_2m < 0 ||
    current.relative_humidity_2m > 100 ||
    current.wind_speed_10m < 0 ||
    current.wind_direction_10m < 0 ||
    current.wind_direction_10m > 360 ||
    current.precipitation < 0
  ) {
    return null;
  }

  return {
    temp: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windDir: current.wind_direction_10m,
    precipitation: current.precipitation,
  };
}

function numericArray(value: unknown, length: number): number[] | null {
  return Array.isArray(value) &&
    value.length === length &&
    value.every(finiteNumber)
    ? value
    : null;
}

export function parseForecastDays(value: unknown): ForecastDay[] | null {
  if (!isObject(value) || !Array.isArray(value.time) || value.time.length === 0) {
    return null;
  }

  const dates = value.time;
  const length = dates.length;
  const maxTemps = numericArray(value.temperature_2m_max, length);
  const minTemps = numericArray(value.temperature_2m_min, length);
  const precipitation = numericArray(value.precipitation_sum, length);
  const windMax = numericArray(value.wind_speed_10m_max, length);
  const weatherCodes = numericArray(value.weather_code, length);
  if (
    !dates.every((date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) ||
    !maxTemps ||
    !minTemps ||
    !precipitation ||
    !windMax ||
    !weatherCodes ||
    precipitation.some((amount) => amount < 0) ||
    windMax.some((speed) => speed < 0) ||
    weatherCodes.some(
      (code) => !Number.isInteger(code) || code < 0 || code > 99
    )
  ) {
    return null;
  }

  return dates.map((date, index) => ({
    date,
    maxTemp: maxTemps[index],
    minTemp: minTemps[index],
    precipitation: precipitation[index],
    windMax: windMax[index],
    weatherCode: weatherCodes[index],
  }));
}

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "sun" },
  1: { label: "Mainly clear", icon: "sun-cloud" },
  2: { label: "Partly cloudy", icon: "cloud-sun" },
  3: { label: "Overcast", icon: "cloud" },
  45: { label: "Fog", icon: "fog" },
  48: { label: "Fog", icon: "fog" },
  51: { label: "Light drizzle", icon: "drizzle" },
  53: { label: "Drizzle", icon: "drizzle" },
  55: { label: "Heavy drizzle", icon: "drizzle" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  80: { label: "Rain showers", icon: "rain" },
  81: { label: "Rain showers", icon: "rain" },
  82: { label: "Heavy showers", icon: "rain" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm", icon: "storm" },
  99: { label: "Thunderstorm", icon: "storm" },
};

export function getWeatherLabel(code: number): string {
  return WMO_CODES[code]?.label || "—";
}

export async function fetchSunTimes(): Promise<SunTimes | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset&current=temperature_2m&timezone=Australia/Sydney&forecast_days=1`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[forecast] Sun times failed: HTTP ${res.status}`);
      return null;
    }
    const data: unknown = await res.json();
    if (!isObject(data) || !isObject(data.daily) || !isObject(data.current)) return null;
    const sunrise = Array.isArray(data.daily.sunrise) ? data.daily.sunrise[0] : null;
    const sunset = Array.isArray(data.daily.sunset) ? data.daily.sunset[0] : null;
    if (!validLocalDateTime(sunrise) || !validLocalDateTime(sunset)) return null;
    const observedAt = openMeteoObservedAt(data.current.time, data.utc_offset_seconds);
    if (!observedAt) {
      console.error("[forecast] Sun times response had no valid source timestamp");
      return null;
    }
    return {
      sunrise,
      sunset,
      ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.forecast),
    };
  } catch (error) {
    console.error("[forecast] Sun times error:", error);
    return null;
  }
}

export async function fetchCurrentWeather(): Promise<CurrentConditions | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&timezone=Australia/Sydney`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[forecast] Current conditions failed: HTTP ${res.status}`);
      return null;
    }
    const data: unknown = await res.json();
    if (!isObject(data) || !isObject(data.current)) return null;
    const current = currentWeatherFrom(data.current);
    const weatherCode = data.current.weather_code;
    if (
      !current ||
      !finiteNumber(weatherCode) ||
      !Number.isInteger(weatherCode) ||
      weatherCode < 0 ||
      weatherCode > 99
    ) {
      return null;
    }
    const observedAt = openMeteoObservedAt(data.current.time, data.utc_offset_seconds);
    if (!observedAt) {
      console.error("[forecast] Current conditions had no valid source timestamp");
      return null;
    }
    return {
      ...current,
      weatherCode,
      ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.weather),
    };
  } catch (error) {
    console.error("[forecast] Current conditions error:", error);
    return null;
  }
}

export async function fetchForecast(): Promise<WeatherForecast | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&timezone=Australia/Sydney&forecast_days=5`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[forecast] Forecast failed: HTTP ${res.status}`);
      return null;
    }

    const data: unknown = await res.json();
    if (!isObject(data) || !isObject(data.current) || !isObject(data.daily)) return null;
    const daily = parseForecastDays(data.daily);
    const current = currentWeatherFrom(data.current);
    const sunrise = Array.isArray(data.daily.sunrise) ? data.daily.sunrise[0] : null;
    const sunset = Array.isArray(data.daily.sunset) ? data.daily.sunset[0] : null;
    if (!daily || !current || !validLocalDateTime(sunrise) || !validLocalDateTime(sunset)) {
      return null;
    }
    const observedAt = openMeteoObservedAt(data.current.time, data.utc_offset_seconds);
    if (!observedAt) {
      console.error("[forecast] Forecast response had no valid source timestamp");
      return null;
    }

    return {
      current,
      daily,
      sunrise,
      sunset,
      ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.forecast),
    };
  } catch (error) {
    console.error("[forecast] Fetch error:", error);
    return null;
  }
}
