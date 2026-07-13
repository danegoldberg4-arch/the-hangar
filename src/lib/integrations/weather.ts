import { prisma } from "@/lib/prisma";
import {
  FRESHNESS_THRESHOLDS,
  observationMeta,
  parseSourceTimestamp,
  storedObservationMeta,
  type ObservationMeta,
} from "@/lib/integrations/freshness";
import { fetchWithTimeout } from "@/lib/integrations/http";
import { dateKeyInTimeZone, zonedDateTimeToUtc } from "@/lib/time";

const BOM_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const NOWRA_STATION = "94750";
const BOM_OBS_URL = `https://www.bom.gov.au/fwo/IDN60801/IDN60801.${NOWRA_STATION}.json`;
const RFS_FDR_URL = "https://www.rfs.nsw.gov.au/feeds/fdrToban.xml";
const BOM_WARNINGS_URL = "https://www.bom.gov.au/fwo/IDZ00061.warnings_land_nsw.xml";
const DISTRICT_NAME = "Illawarra/Shoalhaven";

export interface WeatherObservation extends ObservationMeta {
  station: string;
  airTemp: number | null;
  apparentTemp: number | null;
  humidity: number | null;
  windDir: string | null;
  windSpdKmh: number | null;
  gustKmh: number | null;
  rainTrace: string | null;
  cloud: string | null;
  pressure: number | null;
}

export interface FireDangerRating extends ObservationMeta {
  district: string;
  reportDate: string;
  dangerToday: string;
  dangerTomorrow: string;
  fireBanToday: boolean;
  fireBanTomorrow: boolean;
}

export interface WeatherWarning {
  title: string;
  link: string;
  pubDate: string;
}

interface BomRecord {
  name: string;
  air_temp: number | null;
  apparent_t: number | null;
  rel_hum: number | null;
  wind_dir: string;
  wind_spd_kmh: number | null;
  gust_kmh: number | null;
  rain_trace: string | null;
  cloud: string;
  press: number | null;
  aifstime_utc?: string;
  local_date_time_full?: string;
}

function sydneyDateKey(date: Date): string {
  return dateKeyInTimeZone(date, "Australia/Sydney");
}

function fireDangerMeta(observedAt: Date, reportDate: string): ObservationMeta {
  const meta = observationMeta(observedAt, Number.MAX_SAFE_INTEGER);
  if (meta.freshness === "unavailable") return meta;
  return {
    ...meta,
    freshness: reportDate === sydneyDateKey(new Date()) ? "live" : "stale",
  };
}

function fieldsFromBom(record: BomRecord) {
  return {
    station: record.name || "Nowra",
    airTemp: record.air_temp ?? null,
    apparentTemp: record.apparent_t ?? null,
    humidity: record.rel_hum ?? null,
    windDir: record.wind_dir !== "-" ? record.wind_dir : null,
    windSpdKmh: record.wind_spd_kmh ?? null,
    gustKmh: record.gust_kmh ?? null,
    rainTrace: record.rain_trace ?? null,
    cloud: record.cloud !== "-" ? record.cloud : null,
    pressure: record.press ?? null,
  };
}

function bomObservedAt(record: BomRecord): Date | null {
  const utc = record.aifstime_utc;
  if (utc && /^\d{14}$/.test(utc)) {
    const iso = `${utc.slice(0, 4)}-${utc.slice(4, 6)}-${utc.slice(6, 8)}T${utc.slice(8, 10)}:${utc.slice(10, 12)}:${utc.slice(12, 14)}Z`;
    const date = parseSourceTimestamp(iso);
    if (date) return date;
  }

  const local = record.local_date_time_full;
  if (local && /^\d{14}$/.test(local)) {
    return parseSourceTimestamp(
      zonedDateTimeToUtc(
        {
          year: Number(local.slice(0, 4)),
          month: Number(local.slice(4, 6)),
          day: Number(local.slice(6, 8)),
          hour: Number(local.slice(8, 10)),
          minute: Number(local.slice(10, 12)),
          second: Number(local.slice(12, 14)),
        },
        "Australia/Sydney"
      )
    );
  }

  return null;
}

function storeWeatherRecord(record: BomRecord, observedAt: Date) {
  const fields = fieldsFromBom(record);
  return prisma.weatherData.upsert({
    where: {
      station_observedAt: { station: fields.station, observedAt },
    },
    create: { ...fields, observedAt, sourceTimestampTrusted: true },
    update: { ...fields, sourceTimestampTrusted: true },
  });
}

export async function fetchWeatherObservation(): Promise<WeatherObservation | null> {
  try {
    const res = await fetchWithTimeout(BOM_OBS_URL, {
      headers: { "User-Agent": BOM_UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`[weather] BOM observation failed: HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const allData: BomRecord[] = json?.observations?.data ?? [];
    const latest = allData[0];
    if (!latest) {
      console.error("[weather] BOM response contained no observations");
      return null;
    }
    const observedAt = bomObservedAt(latest);
    if (!observedAt) {
      console.error("[weather] Latest BOM observation had no valid source timestamp");
      return null;
    }

    await storeWeatherRecord(latest, observedAt);

    return {
      ...fieldsFromBom(latest),
      ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.weather),
    };
  } catch (error) {
    console.error("[weather] Fetch error:", error);
    return null;
  }
}

export async function fetchFireDanger(): Promise<FireDangerRating | null> {
  try {
    const res = await fetchWithTimeout(RFS_FDR_URL, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[fire-danger] RFS feed failed: HTTP ${res.status}`);
      return null;
    }

    const observedAt = parseSourceTimestamp(res.headers.get("last-modified"));
    if (!observedAt) {
      console.error("[fire-danger] RFS feed had no valid Last-Modified timestamp");
      return null;
    }

    const xml = await res.text();
    const districtMatch = xml.match(
      new RegExp(
        `<District>.*?<Name>${DISTRICT_NAME}</Name>.*?<DangerLevelToday>(.*?)</DangerLevelToday>.*?<DangerLevelTomorrow>(.*?)</DangerLevelTomorrow>.*?<FireBanToday>(.*?)</FireBanToday>.*?<FireBanTomorrow>(.*?)</FireBanTomorrow>.*?</District>`,
        "s"
      )
    );
    if (!districtMatch) {
      console.error("[fire-danger] District was missing from the RFS feed");
      return null;
    }

    const reportDate = sydneyDateKey(observedAt);
    const rating = {
      district: DISTRICT_NAME,
      reportDate,
      dangerToday: districtMatch[1],
      dangerTomorrow: districtMatch[2],
      fireBanToday: districtMatch[3].toLowerCase() === "yes",
      fireBanTomorrow: districtMatch[4].toLowerCase() === "yes",
    };

    await prisma.fireDanger.upsert({
      where: { district_reportDate: { district: DISTRICT_NAME, reportDate } },
      create: { ...rating, observedAt, sourceTimestampTrusted: true },
      update: { ...rating, observedAt, sourceTimestampTrusted: true },
    });
    return {
      ...rating,
      ...fireDangerMeta(observedAt, reportDate),
    };
  } catch (error) {
    console.error("[fire-danger] Fetch error:", error);
    return null;
  }
}

export async function fetchWeatherWarnings(): Promise<WeatherWarning[] | null> {
  try {
    const res = await fetchWithTimeout(BOM_WARNINGS_URL, {
      headers: { "User-Agent": BOM_UA },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error(`[warnings] BOM feed failed: HTTP ${res.status}`);
      return null;
    }

    const xml = await res.text();
    const items: WeatherWarning[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title>(.*?)<\/title>/)?.[1];
      const link = block.match(/<link>(.*?)<\/link>/)?.[1];
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      if (!title || !link) continue;

      const isRelevant = [
        "Illawarra",
        "South Coast",
        "Shoalhaven",
        "Southern Tablelands",
        "Snowy Mountains",
        "ACT",
      ].some((place) => title.includes(place));
      if (isRelevant) {
        items.push({ title, link, pubDate: pubDate || "" });
      }
    }
    return items;
  } catch (error) {
    console.error("[warnings] Fetch error:", error);
    return null;
  }
}

export async function getLatestWeather(): Promise<WeatherObservation | null> {
  const latest = await prisma.weatherData.findFirst({
    where: { sourceTimestampTrusted: true },
    orderBy: { observedAt: "desc" },
  });
  if (!latest) return null;

  return {
    station: latest.station,
    airTemp: latest.airTemp,
    apparentTemp: latest.apparentTemp,
    humidity: latest.humidity,
    windDir: latest.windDir,
    windSpdKmh: latest.windSpdKmh,
    gustKmh: latest.gustKmh,
    rainTrace: latest.rainTrace,
    cloud: latest.cloud,
    pressure: latest.pressure,
    ...storedObservationMeta(
      latest.observedAt,
      FRESHNESS_THRESHOLDS.weather,
      latest.sourceTimestampTrusted
    ),
  };
}

export async function getLatestFireDanger(): Promise<FireDangerRating | null> {
  const latest = await prisma.fireDanger.findFirst({
    orderBy: { observedAt: "desc" },
    where: {
      district: DISTRICT_NAME,
      reportDate: { not: null },
      sourceTimestampTrusted: true,
    },
  });
  if (!latest || !latest.reportDate) return null;

  return {
    district: latest.district,
    reportDate: latest.reportDate,
    dangerToday: latest.dangerToday,
    dangerTomorrow: latest.dangerTomorrow,
    fireBanToday: latest.fireBanToday,
    fireBanTomorrow: latest.fireBanTomorrow,
    ...fireDangerMeta(latest.observedAt, latest.reportDate),
  };
}
