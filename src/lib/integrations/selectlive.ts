import { prisma } from "@/lib/prisma";

const SELECT_LIVE_URL = "https://select.live";

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
  now: number;
  items: SelectLiveData;
  comment: string;
}

let cachedCookies: string | null = null;
let cookieExpiry: number = 0;

export interface PowerStatus {
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
  timestamp: number;
  stale: boolean;
}

async function login(): Promise<string | null> {
  const email = process.env.SELECT_LIVE_EMAIL;
  const password = process.env.SELECT_LIVE_PWD;

  if (!email || !password) {
    console.error("[select.live] Missing SELECT_LIVE_EMAIL or SELECT_LIVE_PWD env vars");
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append("email", email);
    params.append("pwd", password);

    const res = await fetch(`${SELECT_LIVE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      console.error("[select.live] No Set-Cookie header in login response");
      return null;
    }

    const cookies = setCookie
      .split(",")
      .map((c) => c.split(";")[0])
      .join("; ");

    cachedCookies = cookies;
    cookieExpiry = Date.now() + 25 * 60 * 1000;

    return cookies;
  } catch (err) {
    console.error("[select.live] login error:", err);
    return null;
  }
}

async function getCookies(): Promise<string | null> {
  if (cachedCookies && Date.now() < cookieExpiry) {
    return cachedCookies;
  }
  return login();
}

function isMagicWindow(): boolean {
  const minute = new Date().getMinutes();
  return minute >= 48 && minute <= 52;
}

export async function fetchPowerData(): Promise<PowerStatus | null> {
  const systemNumber = process.env.SELECT_LIVE_SYSTEM;

  if (!systemNumber) {
    return null;
  }

  if (isMagicWindow()) {
    console.log("[select.live] In magic window (minutes 48-52), skipping fetch");
    return getLatestPower();
  }

  try {
    const cookies = await getCookies();
    if (!cookies) return getLatestPower();

    const res = await fetch(
      `${SELECT_LIVE_URL}/dashboard/hfdata/${systemNumber}`,
      {
        headers: {
          Cookie: cookies,
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      }
    );

    if (res.status === 401 || res.status === 302) {
      cachedCookies = null;
      cookieExpiry = 0;
      const freshCookies = await login();
      if (!freshCookies) return getLatestPower();

      const retryRes = await fetch(
        `${SELECT_LIVE_URL}/dashboard/hfdata/${systemNumber}`,
        {
          headers: {
            Cookie: freshCookies,
            Accept: "application/json",
          },
          next: { revalidate: 0 },
        }
      );

      if (!retryRes.ok) return getLatestPower();
      const data: SelectLiveResponse = await retryRes.json();
      return processAndStore(data);
    }

    if (!res.ok) return getLatestPower();

    const data: SelectLiveResponse = await res.json();
    return processAndStore(data);
  } catch (err) {
    console.error("[select.live] fetch error:", err);
    return getLatestPower();
  }
}

function processAndStore(data: SelectLiveResponse): PowerStatus {
  const items = data.items;
  const totalSolar = (items.solarinverter_w || 0) + (items.shunt_w || 0);

  const status: PowerStatus = {
    batterySoc: items.battery_soc,
    batteryW: items.battery_w,
    solarW: totalSolar,
    loadW: items.load_w,
    gridW: items.grid_w,
    genStatus: items.gen_status,
    genRunning: items.gen_status > 0,
    faultCode: items.fault_code,
    solarKwhToday: items.solar_wh_today,
    loadKwhToday: items.load_wh_today,
    batteryInKwhToday: items.battery_in_wh_today,
    batteryOutKwhToday: items.battery_out_wh_today,
    timestamp: items.timestamp || data.now,
    stale: false,
  };

  prisma.powerReading
    .create({
      data: {
        batterySoc: status.batterySoc,
        batteryW: status.batteryW,
        solarW: status.solarW,
        loadW: status.loadW,
        gridW: status.gridW,
        genStatus: status.genStatus,
        solarKwhToday: status.solarKwhToday,
        loadKwhToday: status.loadKwhToday,
        batteryInKwhToday: status.batteryInKwhToday,
        batteryOutKwhToday: status.batteryOutKwhToday,
      },
    })
    .catch((err) => console.error("[select.live] DB store error:", err));

  return status;
}

export async function getLatestPower(): Promise<PowerStatus | null> {
  const latest = await prisma.powerReading.findFirst({
    orderBy: { recordedAt: "desc" },
  });

  if (!latest) return null;

  const ageMin = (Date.now() - latest.recordedAt.getTime()) / (1000 * 60);

  return {
    batterySoc: latest.batterySoc,
    batteryW: latest.batteryW,
    solarW: latest.solarW,
    loadW: latest.loadW,
    gridW: latest.gridW,
    genStatus: latest.genStatus,
    genRunning: latest.genStatus > 0,
    faultCode: 0,
    solarKwhToday: latest.solarKwhToday,
    loadKwhToday: latest.loadKwhToday,
    batteryInKwhToday: latest.batteryInKwhToday,
    batteryOutKwhToday: latest.batteryOutKwhToday,
    timestamp: latest.recordedAt.getTime() / 1000,
    stale: ageMin > 10,
  };
}

export async function getPowerHistory(hours: number = 24): Promise<PowerStatus[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const readings = await prisma.powerReading.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
  });

  return readings.map((r) => ({
    batterySoc: r.batterySoc,
    batteryW: r.batteryW,
    solarW: r.solarW,
    loadW: r.loadW,
    gridW: r.gridW,
    genStatus: r.genStatus,
    genRunning: r.genStatus > 0,
    faultCode: 0,
    solarKwhToday: r.solarKwhToday,
    loadKwhToday: r.loadKwhToday,
    batteryInKwhToday: r.batteryInKwhToday,
    batteryOutKwhToday: r.batteryOutKwhToday,
    timestamp: r.recordedAt.getTime() / 1000,
    stale: false,
  }));
}
