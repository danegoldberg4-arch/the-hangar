import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pg", () => ({
  Pool: vi.fn(function Pool() {
    return {};
  }),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(function PrismaPg() {
    return {};
  }),
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: vi.fn(function PrismaClient() {
    return {};
  }),
}));

describe("prisma client database setup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it("gives every transaction time for Neon compute to wake", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost/db?sslmode=verify-full";
    const { PrismaClient } = await import("@/generated/prisma/client");
    await import("./prisma");

    expect(PrismaClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionOptions: expect.objectContaining({
          maxWait: 20_000,
          timeout: 25_000,
        }),
      })
    );
  });

  it("passes verify-full to the Postgres driver for legacy ssl modes", async () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@host/db?sslmode=require&channel_binding=require";
    const { Pool } = await import("pg");
    await import("./prisma");

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString:
          "postgresql://user:pass@host/db?sslmode=verify-full&channel_binding=require",
      })
    );
  });
});
