import { prisma } from "@/lib/prisma";

const BOM_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const NOWRA_STATION = "94750";
const BOM_OBS_URL = `https://www.bom.gov.au/fwo/IDN60801/IDN60801.${NOWRA_STATION}.json`;

const RFS_FDR_URL = "https://www.rfs.nsw.gov.au/feeds/fdrToban.xml";
const BOM_WARNINGS_URL = "https://www.bom.gov.au/fwo/IDZ00061.warnings_land_nsw.xml";

const DISTRICT_NAME = "Illawarra/Shoalhaven";

export interface WeatherObservation {
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
  timestamp: string;
}

export interface FireDangerRating {
  district: string;
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
  local_date_time_full: string;
}

function recordFromBom(d: BomRecord) {
  return {
    station: d.name || "Nowra",
    airTemp: d.air_temp ?? null,
    apparentTemp: d.apparent_t ?? null,
    humidity: d.rel_hum ?? null,
    windDir: d.wind_dir !== "-" ? d.wind_dir : null,
    windSpdKmh: d.wind_spd_kmh ?? null,
    gustKmh: d.gust_kmh ?? null,
    rainTrace: d.rain_trace ?? null,
    cloud: d.cloud !== "-" ? d.cloud : null,
    pressure: d.press ?? null,
  };
}

export async function fetchWeatherObservation(): Promise<WeatherObservation | null> {
  try {
    const res = await fetch(BOM_OBS_URL, {
      headers: { "User-Agent": BOM_UA },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const allData: BomRecord[] = json?.observations?.data ?? [];
    const data = allData[0];

    if (!data) return null;

    const obs: WeatherObservation = {
      ...recordFromBom(data),
      timestamp: data.local_date_time_full || new Date().toISOString(),
    };

    const existingCount = await prisma.weatherData.count();

    if (existingCount < 100) {
      for (const d of allData.reverse()) {
        await prisma.weatherData.create({ data: recordFromBom(d) });
      }
    } else {
      await prisma.weatherData.create({ data: recordFromBom(data) });
    }

    return obs;
  } catch (err) {
    console.error("[weather] fetch error:", err);
    return null;
  }
}

export async function fetchFireDanger(): Promise<FireDangerRating | null> {
  try {
    const res = await fetch(RFS_FDR_URL, {
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const xml = await res.text();

    const districtMatch = xml.match(
      new RegExp(
        `<District>.*?<Name>${DISTRICT_NAME}</Name>.*?<DangerLevelToday>(.*?)</DangerLevelToday>.*?<DangerLevelTomorrow>(.*?)</DangerLevelTomorrow>.*?<FireBanToday>(.*?)</FireBanToday>.*?<FireBanTomorrow>(.*?)</FireBanTomorrow>.*?</District>`,
        "s"
      )
    );

    if (!districtMatch) return null;

    const rating: FireDangerRating = {
      district: DISTRICT_NAME,
      dangerToday: districtMatch[1],
      dangerTomorrow: districtMatch[2],
      fireBanToday: districtMatch[3].toLowerCase() === "yes",
      fireBanTomorrow: districtMatch[4].toLowerCase() === "yes",
    };

    await prisma.fireDanger.create({
      data: {
        district: rating.district,
        dangerToday: rating.dangerToday,
        dangerTomorrow: rating.dangerTomorrow,
        fireBanToday: rating.fireBanToday,
        fireBanTomorrow: rating.fireBanTomorrow,
      },
    });

    return rating;
  } catch (err) {
    console.error("[fire-danger] fetch error:", err);
    return null;
  }
}

export async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  try {
    const res = await fetch(BOM_WARNINGS_URL, {
      headers: { "User-Agent": BOM_UA },
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const items: WeatherWarning[] = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title>(.*?)<\/title>/)?.[1];
      const link = block.match(/<link>(.*?)<\/link>/)?.[1];
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];

      if (title && link) {
        const isRelevant =
          title.includes("Illawarra") ||
          title.includes("South Coast") ||
          title.includes("Shoalhaven") ||
          title.includes("Southern Tablelands") ||
          title.includes("Snowy Mountains") ||
          title.includes("ACT");

        if (isRelevant) {
          items.push({
            title,
            link,
            pubDate: pubDate || new Date().toISOString(),
          });
        }
      }
    }

    return items;
  } catch (err) {
    console.error("[warnings] fetch error:", err);
    return [];
  }
}

export async function getLatestWeather(): Promise<WeatherObservation | null> {
  const latest = await prisma.weatherData.findFirst({
    orderBy: { recordedAt: "desc" },
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
    timestamp: latest.recordedAt.toISOString(),
  };
}

export async function getLatestFireDanger(): Promise<FireDangerRating | null> {
  const latest = await prisma.fireDanger.findFirst({
    orderBy: { recordedAt: "desc" },
    where: { district: DISTRICT_NAME },
  });

  if (!latest) return null;

  return {
    district: latest.district,
    dangerToday: latest.dangerToday,
    dangerTomorrow: latest.dangerTomorrow,
    fireBanToday: latest.fireBanToday,
    fireBanTomorrow: latest.fireBanTomorrow,
  };
}
