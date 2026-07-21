import { prisma } from "@/lib/prisma";
import { cloudLogin, loginDevice } from "tp-link-tapo-connect";

const EMAIL = process.env.TAPO_EMAIL;
const PASSWORD = process.env.TAPO_PASSWORD;

let cachedApi: Awaited<ReturnType<typeof cloudLogin>> | null = null;

async function getApi() {
  if (!EMAIL || !PASSWORD) {
    console.error("[tapo] Missing TAPO_EMAIL or TAPO_PASSWORD");
    return null;
  }

  if (cachedApi) return cachedApi;

  try {
    cachedApi = await cloudLogin(EMAIL, PASSWORD);
    return cachedApi;
  } catch (err) {
    console.error("[tapo] Login error:", err);
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

      let isOn = false;
      let powerW = 0;

      try {
        const dev = await loginDevice(EMAIL!, PASSWORD!, device);
        const info = await dev.getDeviceInfo();
        isOn = info.device_on ?? false;
        const energy = await dev.getEnergyUsage();
        powerW = Number((energy as Record<string, unknown>).current_power ?? 0);
      } catch {
        // Device might be offline
      }

      const existing = await prisma.smartPlug.findFirst({
        where: { deviceId },
      });

      if (existing) {
        await prisma.smartPlug.update({
          where: { id: existing.id },
          data: {
            isOn,
            powerW,
            lastSeen: new Date(),
            ...(device.alias && { name: device.alias }),
          },
        });
      } else {
        await prisma.smartPlug.create({
          data: {
            name: device.alias || `Plug ${deviceId.slice(-4)}`,
            type: "tapo",
            deviceId,
            isOn,
            powerW,
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
    if (!device) return false;

    const dev = await loginDevice(EMAIL!, PASSWORD!, device);
    if (on) {
      await dev.turnOn();
    } else {
      await dev.turnOff();
    }
    return true;
  } catch (err) {
    console.error("[tapo] Set power error:", err);
    return false;
  }
}

export async function getDevicePower(deviceId: string): Promise<number> {
  const api = await getApi();
  if (!api) return 0;

  try {
    const devices = await api.listDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) return 0;

    const dev = await loginDevice(EMAIL!, PASSWORD!, device);
    const energy = await dev.getEnergyUsage();
    return Number((energy as Record<string, unknown>).current_power ?? 0);
  } catch {
    return 0;
  }
}
