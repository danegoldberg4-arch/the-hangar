import { prisma } from "@/lib/prisma";
import { cloudLogin } from "tp-link-tapo-connect";

const EMAIL = process.env.TAPO_EMAIL;
const PASSWORD = process.env.TAPO_PASSWORD;

let cachedApi: Awaited<ReturnType<typeof cloudLogin>> | null = null;
let cacheExpiry = 0;

async function getApi() {
  if (!EMAIL || !PASSWORD) {
    console.error("[tapo] Missing TAPO_EMAIL or TAPO_PASSWORD");
    return null;
  }

  if (cachedApi && Date.now() < cacheExpiry) {
    return cachedApi;
  }

  try {
    cachedApi = await cloudLogin(EMAIL, PASSWORD);
    cacheExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return cachedApi;
  } catch (err) {
    console.error("[tapo] Cloud login error:", err);
    return null;
  }
}

export async function syncDevicesToDb(): Promise<number> {
  const api = await getApi();
  if (!api) return 0;

  try {
    const devices = await api.listDevices();

    let synced = 0;
    for (const device of devices) {
      const deviceId = device.deviceId;
      if (!deviceId) continue;

      // The cloud API doesn't give us on/off state or power readings
      // We track on/off state ourselves based on our commands
      // Power readings require local network access (not available on Vercel)

      const existing = await prisma.smartPlug.findFirst({
        where: { deviceId },
      });

      if (existing) {
        await prisma.smartPlug.update({
          where: { id: existing.id },
          data: {
            lastSeen: new Date(),
            ...(device.alias && { name: device.alias.trim() }),
          },
        });
      } else {
        // New plug discovered
        await prisma.smartPlug.create({
          data: {
            name: (device.alias || `Plug ${deviceId.slice(-4)}`).trim(),
            type: "tapo",
            deviceId,
            isOn: false,
            powerW: 0,
          },
        });
      }
      synced++;
    }

    return synced;
  } catch (err) {
    console.error("[tapo] Sync error:", err);
    return 0;
  }
}

export async function setDevicePower(deviceId: string, on: boolean): Promise<boolean> {
  const api = await getApi();
  if (!api) return false;

  try {
    const devices = await api.listDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) {
      console.error("[tapo] Device not found:", deviceId);
      return false;
    }

    // Use cloud control API (works from Vercel)
    const tapoDevice = api.getTapoDevice(device);
    if (on) {
      await tapoDevice.turnOn();
    } else {
      await tapoDevice.turnOff();
    }

    // Update our tracked state
    await prisma.smartPlug.updateMany({
      where: { deviceId },
      data: { isOn: on, lastSeen: new Date() },
    });

    return true;
  } catch (err) {
    console.error("[tapo] Set power error:", err);
    return false;
  }
}

export async function getDevicePower(): Promise<number> {
  // Power readings require local network access via loginDevice
  // Not available from Vercel serverless
  // The plug board shows "—" for power when not available
  return 0;
}
