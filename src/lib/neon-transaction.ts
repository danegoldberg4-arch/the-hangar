/**
 * Neon suspends compute when the database is idle. Prisma otherwise waits
 * only 2s to start a transaction and 5s for it to finish, which is shorter
 * than a cold resume and surfaces as P2028. These match the pool connection
 * timeout (20s) and query timeout (25s).
 */
export const neonTransactionOptions = {
  maxWait: 20_000,
  timeout: 25_000,
};
