import { prisma } from "@/lib/prisma";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const EMAIL = process.env.TAPO_EMAIL;
const PASSWORD = process.env.TAPO_PASSWORD;

interface TapoCloudDevice {
  deviceId: string;
  deviceName: string;
  alias: string;
  deviceModel: string;
  deviceType: string;
  status: number;
  appServerUrl: string;
  fwVer: string;
  deviceMac: string;
  hwId: string;
  oemId: string;
  deviceHwVer: string;
  deviceRegion: string;
  isSameRegion: boolean;
  role: number;
  accountApiUrl: string;
  appServerUrlV2: string;
  lastBindTime: number;
}

let cachedToken: string | null = null;
let cachedBaseUrl: string | null = null;
let tokenExpiry = 0;

// Try different regional endpoints
const REGION_URLS = [
  "https://aps1-wap.tplinkcloud.com/",  // Asia Pacific (AU)
  "https://use1-wap.tplinkcloud.com/",  // US East
  "https://eu-wap.tplinkcloud.com/",    // Europe
  "https://aps1-wap.tplinknbu.com/",    // AP alternate
];

async function login(): Promise<{ token: string; baseUrl: string } | null> {
  if (!EMAIL || !PASSWORD) {
    console.error("[tapo] Missing TAPO_EMAIL or TAPO_PASSWORD");
    return null;
  }

  if (cachedToken && cachedBaseUrl && Date.now() < tokenExpiry) {
    return { token: cachedToken, baseUrl: cachedBaseUrl };
  }

  const loginRequest = {
    method: "login",
    params: {
      appType: "Tapo_Android",
      cloudUserName: EMAIL,
      cloudPassword: PASSWORD,
      terminalUUID: uuidv4(),
    },
  };

  // Try each regional URL
  for (const url of REGION_URLS) {
    try {
      const response = await axios({
        method: "post",
        url,
        data: loginRequest,
        timeout: 10000,
      });

      if (response.data?.error_code === 0 && response.data?.result?.token) {
        const token: string = response.data.result.token;
        cachedToken = token;
        cachedBaseUrl = url;
        tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
        console.log("[tapo] Logged in via", url);
        return { token, baseUrl: url };
      }
    } catch {
      // Try next region
    }
  }

  console.error("[tapo] Login failed on all regional endpoints");
  return null;
}

async function listDevices(): Promise<TapoCloudDevice[]> {
  const auth = await login();
  if (!auth) return [];

  try {
    const response = await axios({
      method: "post",
      url: auth.baseUrl,
      data: { method: "getDeviceList" },
      params: { token: auth.token },
      timeout: 10000,
    });

    if (response.data?.error_code !== 0) {
      console.error("[tapo] List devices error:", response.data?.error_code, response.data?.msg);
      return [];
    }

    return (response.data?.result?.deviceList || []) as TapoCloudDevice[];
  } catch (err) {
    console.error("[tapo] List devices failed:", err);
    return [];
  }
}

async function sendDeviceCommand(
  device: TapoCloudDevice,
  token: string,
  request: Record<string, unknown>
): Promise<boolean> {
  try {
    const deviceRequest = {
      method: "passthrough",
      params: {
        deviceId: device.deviceId,
        requestData: JSON.stringify(request),
      },
    };

    const response = await axios({
      method: "post",
      url: device.appServerUrl,
      data: deviceRequest,
      params: { token },
      timeout: 15000,
    });

    if (response.data?.error_code !== 0) {
      console.error("[tapo] Command error:", response.data?.error_code, response.data?.msg);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[tapo] Command failed:", err);
    return false;
  }
}

async function getDeviceInfo(
  device: TapoCloudDevice,
  token: string
): Promise<{ device_on: boolean; current_power?: number } | null> {
  try {
    const response = await axios({
      method: "post",
      url: device.appServerUrl,
      data: {
        method: "passthrough",
        params: {
          deviceId: device.deviceId,
          requestData: JSON.stringify({
            system: { get_sysinfo: null },
            "smartlife.iot.dimmer": { get_dimmer_parameters: null },
            "smartlife.iot.common.emeter": {
              get_realtime: null,
              get_monthstat: { year: new Date().getFullYear() },
              get_daystat: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
            },
          }),
        },
      },
      params: { token },
      timeout: 15000,
    });

    if (response.data?.error_code !== 0) {
      return null;
    }

    const responseData = JSON.parse(response.data?.result?.responseData || "{}");
    const sysInfo = responseData?.system?.get_sysinfo;
    const emeter = responseData?.["smartlife.iot.common.emeter"]?.get_realtime;

    return {
      device_on: sysInfo?.device_on ?? false,
      current_power: emeter?.power_mw ? emeter.power_mw / 1000 : undefined,  // mW to W
    };
  } catch {
    return null;
  }
}

export async function syncDevicesToDb(): Promise<number> {
  const auth = await login();
  if (!auth) return 0;

  const devices = await listDevices();
  if (devices.length === 0) return 0;

  let synced = 0;
  for (const device of devices) {
    const deviceId = device.deviceId;
    if (!deviceId) continue;

    // Get actual device state (on/off + power)
    let isOn = false;
    let powerW = 0;

    const info = await getDeviceInfo(device, auth.token);
    if (info) {
      isOn = info.device_on;
      powerW = info.current_power ?? 0;
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
          ...(device.alias && { name: device.alias.trim() }),
        },
      });
    } else {
      await prisma.smartPlug.create({
        data: {
          name: (device.alias || `Plug ${deviceId.slice(-4)}`).trim(),
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
}

export async function setDevicePower(deviceId: string, on: boolean): Promise<boolean> {
  const auth = await login();
  if (!auth) return false;

  const devices = await listDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  if (!device) {
    console.error("[tapo] Device not found:", deviceId);
    return false;
  }

  // Clear token cache to get a fresh token for the command
  cachedToken = null;

  const freshAuth = await login();
  if (!freshAuth) return false;

  const success = await sendDeviceCommand(device, freshAuth.token, {
    system: {
      set_relay_state: {
        state: on ? 1 : 0,
      },
    },
  });

  if (success) {
    // Update DB state
    await prisma.smartPlug.updateMany({
      where: { deviceId },
      data: { isOn: on, lastSeen: new Date() },
    });

    // Try to get power reading after toggle
    const info = await getDeviceInfo(device, freshAuth.token);
    if (info) {
      await prisma.smartPlug.updateMany({
        where: { deviceId },
        data: { powerW: info.current_power ?? 0 },
      });
    }
  }

  return success;
}
