import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function pruneTelemetry(now = new Date()) {
  const before = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const [power, starlink, weather, fireDanger, systemStatus] = await prisma.$transaction([
    prisma.powerReading.deleteMany({ where: { observedAt: { lt: before(90) } } }),
    prisma.starlinkStatus.deleteMany({ where: { observedAt: { lt: before(30) } } }),
    prisma.weatherData.deleteMany({ where: { observedAt: { lt: before(90) } } }),
    prisma.fireDanger.deleteMany({ where: { observedAt: { lt: before(90) } } }),
    prisma.systemStatus.deleteMany({ where: { observedAt: { lt: before(90) } } }),
  ]);

  return {
    power: power.count,
    starlink: starlink.count,
    weather: weather.count,
    fireDanger: fireDanger.count,
    systemStatus: systemStatus.count,
  };
}
