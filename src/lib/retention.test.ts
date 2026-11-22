import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const model = () => ({ deleteMany: vi.fn((args: unknown) => args) });
  return {
    prisma: {
      $transaction: vi.fn(async (operations: unknown[]) =>
        operations.map(() => ({ count: 0 }))
      ),
      powerReading: model(),
      starlinkStatus: model(),
      weatherData: model(),
      fireDanger: model(),
      systemStatus: model(),
    },
  };
});

import { prisma } from "@/lib/prisma";
import { pruneTelemetry } from "./integrations/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("telemetry cleanup", () => {
  beforeEach(() => {
    vi.mocked(prisma.powerReading.deleteMany).mockClear();
    vi.mocked(prisma.$transaction).mockClear();
  });

  it("waits long enough for Neon compute to wake before the cleanup transaction", async () => {
    const now = new Date("2026-11-20T00:00:00.000Z");

    await expect(pruneTelemetry(now)).resolves.toEqual({
      power: 0,
      starlink: 0,
      weather: 0,
      fireDanger: 0,
      systemStatus: 0,
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ maxWait: 20_000, timeout: 25_000 })
    );

    const cutoff = (days: number) => new Date(now.getTime() - days * DAY_MS);
    expect(prisma.powerReading.deleteMany).toHaveBeenCalledWith({
      where: { observedAt: { lt: cutoff(90) } },
    });
    expect(prisma.starlinkStatus.deleteMany).toHaveBeenCalledWith({
      where: { observedAt: { lt: cutoff(30) } },
    });
    expect(prisma.powerReading.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.systemStatus.deleteMany).toHaveBeenCalledTimes(1);
  });
});
