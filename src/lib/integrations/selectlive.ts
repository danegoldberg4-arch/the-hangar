import { prisma } from "@/lib/prisma";
import {
  FRESHNESS_THRESHOLDS,
  observationMeta,
  parseSourceTimestamp,
  storedObservationMeta,
  type ObservationMeta,
} from "@/lib/integrations/freshness";
import { fetchWithTimeout } from "@/lib/integrations/http";

const SELECT_LIVE_URL = "https://select.live";
const POWER_SOURCE = "select.live";
const SELECT_LIVE_DEADLINE_MS = 24_000;
const SELECT_LIVE_REQUEST_TIMEOUT_MS = 5_500;

interface SelectLiveData {
  battery_soc: number;
  battery_w: number;
  solarinverter_w: number;
  shunt_w: number;
  load_w: number;
  grid_w: number;
  gen_status: number;
  fault_code: number;
  battery_in_wh_today: number;
  battery_out_wh_today: number;
  solar_wh_today: number;
  load_wh_today: number;
  timestamp: number;
}

interface SelectLiveResponse {
  device: { name: string };
  item_count: number;
  items: SelectLiveData;
  comment: string;
}

let cachedCookies: string | null = null;
let cookieExpiry = 0;

export interface PowerStatus extends ObservationMeta {
  batterySoc: number;
  batteryW: number;
  solarW: number;
  loadW: number;
  gridW: number;
  genStatus: number;
  genRunning: boolean;
  faultCode: number;
  solarKwhToday: number;
  loadKwhToday: number;
  batteryInKwhToday: number;
  batteryOutKwhToday: number;
}

function requestTimeout(deadline: number): number {
  const remaining = deadline - Date.now();
  if (remaining < 500) throw new Error("select.live request deadline exhausted");
  return Math.min(SELECT_LIVE_REQUEST_TIMEOUT_MS, remaining);
}

async function login(deadline: number): Promise<string | null> {
  const email = process.env.SELECT_LIVE_EMAIL;
  const password = process.env.SELECT_LIVE_PWD;

  if (!email || !password || password === "CHANGE_ME") {
    console.error("[select.live] Credentials are not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({ email, pwd: password });
    const res = await fetchWithTimeout(
      `${SELECT_LIVE_URL}/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        redirect: "manual",
      },
      requestTimeout(deadline)
    );

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      console.error(`[select.live] Login failed: HTTP ${res.status}, no session cookie`);
      return null;
    }

    cachedCookies = setCookie
      .split(/,(?=\s*[^;,=\s]+=[^;,]+)/)
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    cookieExpiry = Date.now() + 25 * 60 * 1000;
    return cachedCookies;
  } catch (error) {
    console.error("[select.live] Login error:", error);
    return null;
  }
}

async function getCookies(deadline: number): Promise<string | null> {
  if (cachedCookies && Date.now() < cookieExpiry) return cachedCookies;
  return login(deadline);
}

function isMagicWindow(): boolean {
  const minute = new Date().getMinutes();
  return minute >= 48 && minute <= 52;
}

function sourceDate(timestamp: number): Date | null {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const milliseconds = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  return parseSourceTimestamp(milliseconds);
}

async function requestPower(
  systemNumber: string,
  cookies: string,
  deadline: number
): Promise<Response> {
  return fetchWithTimeout(
    `${SELECT_LIVE_URL}/dashboard/hfdata/${systemNumber}`,
    {
      headers: { Cookie: cookies, Accept: "application/json" },
      next: { revalidate: 0 },
    },
    requestTimeout(deadline)
  );
}

export async function fetchPowerData(): Promise<PowerStatus | null> {
  const systemNumber = process.env.SELECT_LIVE_SYSTEM;
  if (!systemNumber) {
    console.error("[select.live] SELECT_LIVE_SYSTEM is not configured");
    return null;
  }

  // select.live performs a short hourly aggregation during this window.
  if (isMagicWindow()) {
    console.warn("[select.live] Source aggregation window; refresh skipped");
    return getLatestPower();
  }

  try {
    const deadline = Date.now() + SELECT_LIVE_DEADLINE_MS;
    let cookies = await getCookies(deadline);
    if (!cookies) return null;

    let res = await requestPower(systemNumber, cookies, deadline);
    if (res.status === 401 || res.status === 302) {
      cachedCookies = null;
      cookieExpiry = 0;
      cookies = await login(deadline);
      if (!cookies) return null;
      res = await requestPower(systemNumber, cookies, deadline);
    }

    if (!res.ok) {
      console.error(`[select.live] Data fetch failed: HTTP ${res.status}`);
      return null;
    }

    return await processAndStore((await res.json()) as SelectLiveResponse);
  } catch (error) {
    console.error("[select.live] Fetch error:", error);
    return null;
  }
}

async function processAndStore(data: SelectLiveResponse): Promise<PowerStatus | null> {
  const items = data.items;
  if (!items) {
    console.error("[select.live] Response contained no telemetry items");
    return null;
  }
  const numericFields: (keyof SelectLiveData)[] = [
    "battery_soc",
    "battery_w",
    "solarinverter_w",
    "shunt_w",
    "load_w",
    "grid_w",
    "gen_status",
    "fault_code",
    "battery_in_wh_today",
    "battery_out_wh_today",
    "solar_wh_today",
    "load_wh_today",
    "timestamp",
  ];
  if (numericFields.some((field) => !Number.isFinite(items[field]))) {
    console.error("[select.live] Response contained invalid telemetry values");
    return null;
  }
  const observedAt = sourceDate(items.timestamp);
  if (!observedAt) {
    console.error("[select.live] Response had no valid source timestamp");
    return null;
  }
  const status: PowerStatus = {
    batterySoc: items.battery_soc,
    batteryW: items.battery_w,
    solarW: items.solarinverter_w + items.shunt_w,
    loadW: items.load_w,
    gridW: items.grid_w,
    genStatus: items.gen_status,
    genRunning: items.gen_status > 0,
    faultCode: items.fault_code,
    solarKwhToday: items.solar_wh_today / 1000,
    loadKwhToday: items.load_wh_today / 1000,
    batteryInKwhToday: items.battery_in_wh_today / 1000,
    batteryOutKwhToday: items.battery_out_wh_today / 1000,
    ...observationMeta(observedAt, FRESHNESS_THRESHOLDS.power),
  };

  const reading = {
    batterySoc: status.batterySoc,
    batteryW: status.batteryW,
    solarW: status.solarW,
    loadW: status.loadW,
    gridW: status.gridW,
    genStatus: status.genStatus,
    faultCode: status.faultCode,
    solarKwhToday: status.solarKwhToday,
    loadKwhToday: status.loadKwhToday,
    batteryInKwhToday: status.batteryInKwhToday,
    batteryOutKwhToday: status.batteryOutKwhToday,
  };

  await prisma.powerReading.upsert({
    where: { source_observedAt: { source: POWER_SOURCE, observedAt } },
    create: {
      ...reading,
      source: POWER_SOURCE,
      observedAt,
      sourceTimestampTrusted: true,
    },
    update: { ...reading, sourceTimestampTrusted: true },
  });

  return status;
}

export async function getLatestPower(): Promise<PowerStatus | null> {
  const latest = await prisma.powerReading.findFirst({
    where: { sourceTimestampTrusted: true },
    orderBy: { observedAt: "desc" },
  });
  if (!latest) return null;

  return {
    batterySoc: latest.batterySoc,
    batteryW: latest.batteryW,
    solarW: latest.solarW,
    loadW: latest.loadW,
    gridW: latest.gridW,
    genStatus: latest.genStatus,
    genRunning: latest.genStatus > 0,
    faultCode: latest.faultCode,
    solarKwhToday: latest.solarKwhToday,
    loadKwhToday: latest.loadKwhToday,
    batteryInKwhToday: latest.batteryInKwhToday,
    batteryOutKwhToday: latest.batteryOutKwhToday,
    ...storedObservationMeta(
      latest.observedAt,
      FRESHNESS_THRESHOLDS.power,
      latest.sourceTimestampTrusted
    ),
  };
}

export async function getPowerHistory(hours = 24): Promise<PowerStatus[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const readings = await prisma.powerReading.findMany({
    where: { observedAt: { gte: since }, sourceTimestampTrusted: true },
    orderBy: { observedAt: "asc" },
  });

  return readings.map((reading) => ({
    batterySoc: reading.batterySoc,
    batteryW: reading.batteryW,
    solarW: reading.solarW,
    loadW: reading.loadW,
    gridW: reading.gridW,
    genStatus: reading.genStatus,
    genRunning: reading.genStatus > 0,
    faultCode: reading.faultCode,
    solarKwhToday: reading.solarKwhToday,
    loadKwhToday: reading.loadKwhToday,
    batteryInKwhToday: reading.batteryInKwhToday,
    batteryOutKwhToday: reading.batteryOutKwhToday,
    ...storedObservationMeta(
      reading.observedAt,
      FRESHNESS_THRESHOLDS.power,
      reading.sourceTimestampTrusted
    ),
  }));
}
