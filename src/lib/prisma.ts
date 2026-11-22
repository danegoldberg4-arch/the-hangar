import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { connectionStringWithFullSslVerification } from "@/lib/db-connection";
import { neonTransactionOptions } from "@/lib/neon-transaction";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: databaseUrl
      ? connectionStringWithFullSslVerification(databaseUrl)
      : undefined,
    max: 3,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 60_000,
    query_timeout: 25_000,
    keepAlive: true,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ["error"],
    transactionOptions: neonTransactionOptions,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
