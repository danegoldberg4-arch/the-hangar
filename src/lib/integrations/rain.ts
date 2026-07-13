import {
  FRESHNESS_THRESHOLDS,
  observationMeta,
  type ObservationMeta,
} from "@/lib/integrations/freshness";
import { fetchWithTimeout } from "@/lib/integrations/http";
import { openMeteoObservedAt } from "@/lib/integrations/open-meteo";
import { dateKeyInTimeZone } from "@/lib/time";

export interface RainSummary extends ObservationMeta {
  today: number;
  week: number;
  month: number;
  dailyHistory: { date: string; total: number }[];
}

const LAT = -34.73;
const LON = 150.48;

function sydneyDateKey(date: Date): string {
  return dateKeyInTimeZone(date, "Australia/Sydney");
}

export async function getRainSummary(): Promise<RainSummary | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum&current=temperature_2m&timezone=Australia/Sydney&forecast_days=1&past_days=30`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[rain] Open-Meteo request failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const times: unknown = data?.daily?.time;
    const precipitation: unknown = data?.daily?.precipitation_sum;
    if (!Array.isArray(times) || !Array.isArray(precipitation)) return null;

    const dailyHistory = times.flatMap((date, index) => {
      const total = precipitation[index];
      return typeof date === "string" && typeof total === "number" && Number.isFinite(total)
        ? [{ date, total }]
        : [];
    });
    if (dailyHistory.length === 0) return null;

    const todayKey = sydneyDateKey(new Date());
    const todayReading = dailyHistory.find((reading) => reading.date === todayKey);
    if (!todayReading) return null;

    const sum = (days: number) =>
      dailyHistory.slice(-days).reduce((total, reading) => total + reading.total, 0);
    const observedAt = openMeteoObservedAt(data?.current?.time, data?.utc_offset_seconds);
    if (!observedAt) {
      console.error("[rain] Open-Meteo response had no valid source timestamp");
      return null;
    }
    return {
      today: todayReading.total,
      week: sum(7),
      month: sum(30),
      dailyHistory,
      ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.rain),
    };
  } catch (error) {
    console.error("[rain] Fetch error:", error);
    return null;
  }
}
