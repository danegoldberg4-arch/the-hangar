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

export interface WeatherForecast {
  current: CurrentWeather;
  daily: ForecastDay[];
  sunrise: string;
  sunset: string;
}

const LAT = -34.73;
const LON = 150.48;

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

export async function fetchSunTimes(): Promise<{ sunrise: string; sunset: string } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset&timezone=Australia/Sydney&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return { sunrise: data.daily.sunrise[0], sunset: data.daily.sunset[0] };
  } catch {
    return null;
  }
}

export interface CurrentConditions {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  precipitation: number;
  weatherCode: number;
}

export async function fetchCurrentWeather(): Promise<CurrentConditions | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&timezone=Australia/Sydney`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDir: data.current.wind_direction_10m,
      precipitation: data.current.precipitation,
      weatherCode: data.current.weather_code,
    };
  } catch {
    return null;
  }
}

export async function fetchForecast(): Promise<WeatherForecast | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&timezone=Australia/Sydney&forecast_days=5`;

    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) return null;

    const data = await res.json();

    const daily: ForecastDay[] = data.daily.time.map((date: string, i: number) => ({
      date,
      maxTemp: data.daily.temperature_2m_max[i],
      minTemp: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      windMax: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code[i],
    }));

    const current: CurrentWeather = {
      temp: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windDir: data.current.wind_direction_10m,
      precipitation: data.current.precipitation,
    };

    return { current, daily, sunrise: data.daily.sunrise[0], sunset: data.daily.sunset[0] };
  } catch (err) {
    console.error("[forecast] fetch error:", err);
    return null;
  }
}
