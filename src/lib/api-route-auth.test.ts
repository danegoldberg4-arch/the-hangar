import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { auth } = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => null) },
    smartPlug: {
      findMany: vi.fn(async () => [
        { id: "plug-1", deviceId: "tapo-secret", ip: "10.4.4.4", name: "Fridge" },
      ]),
      findUnique: vi.fn(async () => ({
        id: "plug-1",
        deviceId: "tapo-secret",
        ip: "10.4.4.4",
        isOn: false,
        automation: "{}",
      })),
      create: vi.fn(async () => ({ id: "plug-new", deviceId: "new-device", ip: "" })),
      update: vi.fn(async () => ({ id: "plug-1", isOn: true })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    systemStatus: { create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null) },
    starlinkStatus: { findFirst: vi.fn(async () => null) },
    restockItem: { findMany: vi.fn(async () => []), update: vi.fn() },
    maintenanceItem: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock("@/lib/integrations/selectlive", () => ({
  getLatestPower: vi.fn(async () => null),
  fetchPowerData: vi.fn(async () => ({
    batterySoc: 80,
    solarW: 1200,
    loadW: 400,
    gridW: 0,
    genRunning: true,
    genStatus: "running",
    freshness: "live",
  })),
  getPowerHistory: vi.fn(async () => []),
}));

vi.mock("@/lib/integrations/forecast", () => ({
  fetchCurrentWeather: vi.fn(async () => ({
    temp: 21,
    humidity: 40,
    windSpeed: 12,
    windDir: 180,
    precipitation: 0,
    weatherCode: 1,
  })),
  fetchSunTimes: vi.fn(async () => ({ sunrise: "06:00", sunset: "19:30" })),
  fetchForecast: vi.fn(async () => null),
}));

vi.mock("@/lib/integrations/weather", () => ({
  getLatestFireDanger: vi.fn(async () => ({
    dangerToday: "HIGH",
    dangerTomorrow: "EXTREME",
    fireBanToday: true,
  })),
  fetchWeatherWarnings: vi.fn(async () => []),
  fetchWeatherObservation: vi.fn(async () => null),
  fetchFireDanger: vi.fn(async () => null),
}));

vi.mock("@/lib/integrations/tapo", () => ({
  setDevicePower: vi.fn(async () => true),
  syncDevicesToDb: vi.fn(async () => 0),
}));

vi.mock("@/lib/integrations/retention", () => ({
  pruneTelemetry: vi.fn(async () => ({
    power: 0,
    starlink: 0,
    weather: 0,
    fireDanger: 0,
    systemStatus: 0,
  })),
}));

import { prisma } from "@/lib/prisma";
import { GET as getMonitoring } from "@/app/api/monitoring/route";
import { GET as listPlugs } from "@/app/api/plugs/route";
import {
  DELETE as deletePlug,
  GET as getPlug,
  PATCH as patchPlug,
  POST as createPlug,
} from "@/app/api/plugs/[id]/route";
import { GET as pollCron } from "@/app/api/cron/poll/route";
import { POST as ingest } from "@/app/api/ingest/route";
import { POST as tapoRelay } from "@/app/api/tapo-relay/status/route";
import { POST as whatsAppWebhook } from "@/app/api/whatsapp/webhook/route";

function plugContext(id = "plug-1") {
  return { params: Promise.resolve({ id }) };
}

describe("private API routes require a signed-in user", () => {
  beforeEach(() => {
    auth.mockReset();
    auth.mockResolvedValue(null);
    vi.mocked(prisma.smartPlug.deleteMany).mockClear();
    vi.mocked(prisma.smartPlug.create).mockClear();
    vi.mocked(prisma.smartPlug.update).mockClear();
    vi.mocked(prisma.smartPlug.findUnique).mockClear();
  });

  it("hides live house monitoring from anonymous callers", async () => {
    const response = await getMonitoring();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("hides plug device ids and addresses from anonymous callers", async () => {
    const response = await listPlugs();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(JSON.stringify(body)).not.toContain("10.4.4.4");
    expect(JSON.stringify(body)).not.toContain("tapo-secret");
  });

  it("rejects anonymous plug reads, creates, toggles, and deletes", async () => {
    const read = await getPlug();
    const created = await createPlug(
      new NextRequest("http://localhost/api/plugs/plug-1", {
        method: "POST",
        body: JSON.stringify({ name: "Pump", deviceId: "abc" }),
        headers: { "content-type": "application/json" },
      })
    );
    const toggled = await patchPlug(
      new NextRequest("http://localhost/api/plugs/plug-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "toggle" }),
        headers: { "content-type": "application/json" },
      }),
      plugContext()
    );
    const removed = await deletePlug(
      new NextRequest("http://localhost/api/plugs/plug-1", { method: "DELETE" }),
      plugContext()
    );

    expect(read.status).toBe(401);
    expect(created.status).toBe(401);
    expect(toggled.status).toBe(401);
    expect(removed.status).toBe(401);
    expect(prisma.smartPlug.create).not.toHaveBeenCalled();
    expect(prisma.smartPlug.findUnique).not.toHaveBeenCalled();
    expect(prisma.smartPlug.update).not.toHaveBeenCalled();
    expect(prisma.smartPlug.deleteMany).not.toHaveBeenCalled();
  });

  it("still returns plugs and monitoring to a signed-in household user", async () => {
    auth.mockResolvedValue({
      user: { id: "user-1", email: "ada@example.com", name: "Ada", role: "family" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      role: "family",
      passwordHash: "not-used",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const plugs = await listPlugs();
    const monitoring = await getMonitoring();

    expect(plugs.status).toBe(200);
    await expect(plugs.json()).resolves.toEqual([
      { id: "plug-1", deviceId: "tapo-secret", ip: "10.4.4.4", name: "Fridge" },
    ]);
    expect(monitoring.status).toBe(200);
    await expect(monitoring.json()).resolves.toMatchObject({
      power: { batterySoc: 80, genRunning: true },
      fireDanger: { dangerToday: "HIGH" },
    });
  });
});

describe("callers that are not browser sessions keep their own credentials", () => {
  beforeEach(() => {
    auth.mockReset();
    auth.mockResolvedValue(null);
    process.env.CRON_SECRET = "cron-test-secret";
    process.env.INGEST_TOKEN = "ingest-test-secret";
  });

  it("lets the scheduler run the poll with its bearer token", async () => {
    const response = await pollCron(
      new NextRequest("http://localhost/api/cron/poll", {
        headers: { authorization: "Bearer cron-test-secret" },
      })
    );

    expect(response.status).not.toBe(401);
    expect(auth).not.toHaveBeenCalled();
  });

  it("rejects a poll that does not present the scheduler token", async () => {
    const response = await pollCron(new NextRequest("http://localhost/api/cron/poll"));

    expect(response.status).toBe(401);
  });

  it("lets the relay post telemetry with the ingest token", async () => {
    const response = await ingest(
      new NextRequest("http://localhost/api/ingest", {
        method: "POST",
        headers: { authorization: "Bearer ingest-test-secret" },
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    expect(auth).not.toHaveBeenCalled();
  });

  it("lets the plug relay sync with the ingest token", async () => {
    const response = await tapoRelay(
      new NextRequest("http://localhost/api/tapo-relay/status", {
        method: "POST",
        headers: {
          authorization: "Bearer ingest-test-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ plugs: [] }),
      })
    );

    expect(response.status).not.toBe(401);
    expect(auth).not.toHaveBeenCalled();
  });

  it("refuses WhatsApp messages when the app secret is not configured", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const response = await whatsAppWebhook(
      new NextRequest("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
      })
    );

    expect(response.status).toBe(503);
    expect(prisma.restockItem.findMany).not.toHaveBeenCalled();
  });

  it("accepts a WhatsApp webhook signed with the app secret", async () => {
    const appSecret = "app-secret";
    process.env.WHATSAPP_APP_SECRET = appSecret;
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;

    const response = await whatsAppWebhook(
      new NextRequest("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": signature,
        },
        body: rawBody,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects a WhatsApp webhook that is not signed by Meta", async () => {
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    const response = await whatsAppWebhook(
      new NextRequest("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
      })
    );

    expect(response.status).toBe(401);
    expect(prisma.restockItem.findMany).not.toHaveBeenCalled();
  });
});
