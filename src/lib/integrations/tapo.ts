const TAPO_API_BASE = "https://tapo-api.tplink.com/api/v1";

interface TapoToken {
  token: string;
  expiresAt: number;
}

interface TapoDevice {
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  alias: string;
  status: string;
  powerOn: boolean;
  region: string;
}

interface TapoEnergyData {
  todayEnergy: number;
  monthEnergy: number;
  currentPower: number;
  localTime: string;
}

let cachedToken: TapoToken | null = null;

async function login(): Promise<string | null> {
  const email = process.env.TAPO_EMAIL;
  const password = process.env.TAPO_PASSWORD;

  if (!email || !password) {
    console.error("[tapo] Missing TAPO_EMAIL or TAPO_PASSWORD");
    return null;
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const res = await fetch(`${TAPO_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "login",
        params: {
          username: email,
          password: password,
          cloudToken: "",
        },
      }),
    });

    if (!res.ok) {
      console.error("[tapo] Login failed:", res.status);
      return null;
    }

    const data = await res.json();
    if (data.errorCode !== 0) {
      console.error("[tapo] Login error:", data.errorCode, data.result?.msg);
      return null;
    }

    const token = data.result?.token;
    if (!token) {
      console.error("[tapo] No token in response");
      return null;
    }

    cachedToken = {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23 hours
    };

    return token;
  } catch (err) {
    console.error("[tapo] Login error:", err);
    return null;
  }
}

export async function listDevices(): Promise<TapoDevice[]> {
  const token = await login();
  if (!token) return [];

  try {
    const res = await fetch(`${TAPO_API_BASE}/devices`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (data.errorCode !== 0) return [];

    return (data.result?.deviceList || []).map((d: Record<string, unknown>) => ({
      deviceId: d.deviceId as string,
      deviceName: d.deviceName as string,
      deviceModel: d.deviceModel as string,
      alias: d.alias as string,
      status: d.status as string,
      powerOn: d.deviceOn === true,
      region: d.region as string,
    }));
  } catch (err) {
    console.error("[tapo] List devices error:", err);
    return [];
  }
}

export async function setDevicePower(
  deviceId: string,
  on: boolean
): Promise<boolean> {
  const token = await login();
  if (!token) return false;

  try {
    const res = await fetch(`${TAPO_API_BASE}/devices/${deviceId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        method: "setDeviceInfo",
        params: {
          deviceOn: on,
        },
      }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.errorCode === 0;
  } catch (err) {
    console.error("[tapo] Set power error:", err);
    return false;
  }
}

export async function getDeviceEnergy(
  deviceId: string
): Promise<TapoEnergyData | null> {
  const token = await login();
  if (!token) return null;

  try {
    const res = await fetch(
      `${TAPO_API_BASE}/devices/${deviceId}/energy`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (data.errorCode !== 0) return null;

    return {
      todayEnergy: data.result?.todayEnergy ?? 0,
      monthEnergy: data.result?.monthEnergy ?? 0,
      currentPower: data.result?.currentPower ?? 0,
      localTime: data.result?.localTime ?? "",
    };
  } catch (err) {
    console.error("[tapo] Get energy error:", err);
    return null;
  }
}

export async function syncDevicesToDb(): Promise<number> {
  const devices = await listDevices();
  if (devices.length === 0) return 0;

  let synced = 0;
  for (const device of devices) {
    const existing = await prisma.smartPlug.findFirst({
      where: { deviceId: device.deviceId },
    });

    if (existing) {
      // Update status and power
      const energy = await getDeviceEnergy(device.deviceId);
      await prisma.smartPlug.update({
        where: { id: existing.id },
        data: {
          isOn: device.powerOn,
          powerW: energy?.currentPower ?? 0,
          lastSeen: new Date(),
          ...(device.alias && { name: device.alias }),
        },
      });
    } else {
      // Create new plug entry
      await prisma.smartPlug.create({
        data: {
          name: device.alias || device.deviceName || `Plug ${device.deviceId.slice(-4)}`,
          type: "tapo",
          deviceId: device.deviceId,
          isOn: device.powerOn,
          powerW: 0,
        },
      });
    }
    synced++;
  }

  return synced;
}

// Import prisma here to avoid circular deps at top
import { prisma } from "@/lib/prisma";
