#!/usr/bin/env node

/**
 * The Hangar — Tapo Plug Relay
 * 
 * Runs on an always-on computer at the house. Controls Tapo plugs
 * locally (bypassing the cloud) and syncs state with the Vercel app.
 * 
 * INSTALL:
 *   npm install tp-link-tapo-connect node-fetch
 * 
 * USAGE:
 *   TAPO_EMAIL=you@example.com \
 *   TAPO_PASSWORD=your-password \
 *   SERVER_URL=https://your-deployment.vercel.app \
 *   INGEST_TOKEN=your-token \
 *   node relay-tapo.js
 * 
 * Or create a .env file with those values and run:
 *   node relay-tapo.js
 * 
 * All four values are REQUIRED — the script fails fast if any are missing.
 */

const { cloudLogin, loginDeviceByIp } = require("tp-link-tapo-connect");

// Config — required, no fallbacks (secrets must never be hardcoded)
const required = {
  TAPO_EMAIL: process.env.TAPO_EMAIL,
  TAPO_PASSWORD: process.env.TAPO_PASSWORD,
  SERVER_URL: process.env.SERVER_URL,
  INGEST_TOKEN: process.env.INGEST_TOKEN,
};
for (const [key, value] of Object.entries(required)) {
  if (!value) {
    console.error(`[relay] Missing required env var ${key}. Set it and re-run.`);
    process.exit(1);
  }
}
const TAPO_EMAIL = required.TAPO_EMAIL;
const TAPO_PASSWORD = required.TAPO_PASSWORD;
const SERVER_URL = required.SERVER_URL.replace(/\/$/, "");
const INGEST_TOKEN = required.INGEST_TOKEN;
const POLL_INTERVAL = 30000; // 30 seconds

let plugStates = {}; // deviceId -> { isOn, powerW, ip, name }
let lastSyncedStates = {}; // Track what we last sent to server

async function discoverPlugs() {
  try {
    const api = await cloudLogin(TAPO_EMAIL, TAPO_PASSWORD);
    const devices = await api.listDevices();
    
    const plugs = devices.filter(d => d.deviceType === "SMART.TAPOPLUG");
    console.log(`[relay] Found ${plugs.length} plug(s) on Tapo account`);
    
    return plugs;
  } catch (err) {
    console.error("[relay] Discovery error:", err.message);
    return [];
  }
}

async function getLocalPlugInfo(device) {
  // Try to connect locally using the device IP
  if (!device.ip) {
    console.log(`[relay] No IP for ${device.alias}, skipping local control`);
    return null;
  }

  try {
    const dev = await loginDeviceByIp(TAPO_EMAIL, TAPO_PASSWORD, device.ip);
    const info = await dev.getDeviceInfo();
    
    let powerW = 0;
    try {
      const energy = await dev.getEnergyUsage();
      powerW = energy?.current_power || energy?.power_mw ? (energy.power_mw / 1000) : 0;
    } catch {
      // P100 doesn't have energy monitoring
    }

    return {
      deviceId: device.deviceId,
      name: Buffer.from(device.alias, "base64").toString("utf-8").trim(),
      ip: device.ip,
      isOn: info.device_on,
      powerW,
      dev, // Keep the device handle for control
    };
  } catch (err) {
    console.error(`[relay] Local connect failed for ${device.alias}:`, err.message);
    return null;
  }
}

async function reportToServer(plugs) {
  const payload = {
    source: "tapo_relay",
    plugs: plugs.map(p => ({
      deviceId: p.deviceId,
      name: p.name,
      isOn: p.isOn,
      powerW: p.powerW,
    })),
  };

  try {
    const res = await fetch(`${SERVER_URL}/api/tapo-relay/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INGEST_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      // Check if server has commands for us
      if (data.commands && data.commands.length > 0) {
        console.log(`[relay] Received ${data.commands.length} command(s) from server`);
        for (const cmd of data.commands) {
          await executeCommand(cmd, plugs);
        }
      }
    } else {
      console.error(`[relay] Server report failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[relay] Server communication error:", err.message);
  }
}

async function executeCommand(cmd, plugs) {
  const plug = plugs.find(p => p.deviceId === cmd.deviceId);
  if (!plug || !plug.dev) {
    console.log(`[relay] Can't execute command — plug not connected locally`);
    return;
  }

  console.log(`[relay] Executing: ${cmd.action} on ${plug.name}`);
  
  try {
    if (cmd.action === "turn_on") {
      await plug.dev.turnOn();
      plug.isOn = true;
    } else if (cmd.action === "turn_off") {
      await plug.dev.turnOff();
      plug.isOn = false;
    }
    console.log(`[relay] Done: ${plug.name} is now ${plug.isOn ? "ON" : "OFF"}`);
  } catch (err) {
    console.error(`[relay] Command failed:`, err.message);
  }
}

async function main() {
  console.log("[relay] The Hangar — Tapo Plug Relay");
  console.log(`[relay] Server: ${SERVER_URL}`);
  console.log(`[relay] Tapo account: ${TAPO_EMAIL}`);
  console.log(`[relay] Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log("");

  let cachedDevices = [];

  async function refreshDevices() {
    const devices = await discoverPlugs();
    const plugInfos = [];
    
    for (const device of devices) {
      const info = await getLocalPlugInfo(device);
      if (info) {
        plugInfos.push(info);
        console.log(`[relay] Connected: ${info.name} (${info.ip}) — ${info.isOn ? "ON" : "OFF"} ${info.powerW > 0 ? info.powerW.toFixed(0) + "W" : ""}`);
      }
    }
    
    return plugInfos;
  }

  // Initial discovery
  cachedDevices = await refreshDevices();

  // Main loop
  setInterval(async () => {
    // Refresh device list every 5 minutes
    if (cachedDevices.length === 0 || Math.random() < 0.1) {
      cachedDevices = await refreshDevices();
    } else {
      // Just refresh state of existing plugs
      for (const plug of cachedDevices) {
        try {
          if (plug.dev) {
            const info = await plug.dev.getDeviceInfo();
            plug.isOn = info.device_on;
            try {
              const energy = await plug.dev.getEnergyUsage();
              plug.powerW = energy?.power_mw ? (energy.power_mw / 1000) : 0;
            } catch {}
          }
        } catch {
          // Plug might have gone offline, try to reconnect
          console.log(`[relay] Reconnecting ${plug.name}...`);
          const devices = await discoverPlugs();
          const device = devices.find(d => d.deviceId === plug.deviceId);
          if (device) {
            const info = await getLocalPlugInfo(device);
            if (info) {
              Object.assign(plug, info);
            }
          }
        }
      }
    }

    // Report to server
    await reportToServer(cachedDevices);
    
    // Log status
    const status = cachedDevices.map(p => `${p.name}:${p.isOn ? "ON" : "OFF"}`).join(" | ");
    console.log(`[relay] ${new Date().toLocaleTimeString()} — ${status}`);
  }, POLL_INTERVAL);

  console.log("[relay] Running. Press Ctrl+C to stop.");
}

main().catch(console.error);
