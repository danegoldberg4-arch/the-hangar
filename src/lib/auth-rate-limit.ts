import { prisma } from "@/lib/prisma";
import {
  clientIpFromRequest,
  hashAuthRateLimitKey,
  normalizeRateLimitEmail,
  secondsUntil,
  type AuthRateLimitDimension,
} from "@/lib/auth-rate-limit-key";

type RateLimitPolicy = {
  dimension: AuthRateLimitDimension;
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  attempts: number;
  expiresAt: Date;
};

export type AuthRateLimitDecision = {
  allowed: boolean;
  keyHashes: string[];
  retryAfterSeconds: number;
};

const LOGIN_POLICIES: RateLimitPolicy[] = [
  { dimension: "ip", limit: 30, windowSeconds: 15 * 60 },
  { dimension: "email", limit: 10, windowSeconds: 15 * 60 },
];

const REGISTRATION_POLICIES: RateLimitPolicy[] = [
  { dimension: "ip", limit: 12, windowSeconds: 30 * 60 },
  { dimension: "email", limit: 6, windowSeconds: 30 * 60 },
];

function getRateLimitSecret(): string {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("Auth rate limit secret is not configured");
  return secret;
}

async function consumeAuthRateLimits({
  request,
  email,
  scope,
  policies,
}: {
  request: Pick<Request, "headers">;
  email: unknown;
  scope: string;
  policies: RateLimitPolicy[];
}): Promise<AuthRateLimitDecision> {
  const secret = getRateLimitSecret();
  const now = new Date();
  const identifiers: Record<AuthRateLimitDimension, string> = {
    email: normalizeRateLimitEmail(email),
    ip: clientIpFromRequest(request),
  };
  const entries = policies.map((policy) => {
    const storedScope = `${scope}:${policy.dimension}`;
    return {
      ...policy,
      keyHash: hashAuthRateLimitKey({
        scope,
        dimension: policy.dimension,
        identifier: identifiers[policy.dimension],
        secret,
      }),
      storedScope,
      expiresAt: new Date(now.getTime() + policy.windowSeconds * 1000),
    };
  });

  const rows = await prisma.$transaction(async (tx) => {
    const consumed: Array<RateLimitRow & { limit: number; keyHash: string }> = [];

    for (const entry of entries) {
      const [row] = await tx.$queryRaw<RateLimitRow[]>`
        INSERT INTO "AuthRateLimit" (
          "keyHash",
          "scope",
          "attempts",
          "windowStartedAt",
          "expiresAt",
          "updatedAt"
        )
        VALUES (
          ${entry.keyHash},
          ${entry.storedScope},
          1,
          ${now},
          ${entry.expiresAt},
          ${now}
        )
        ON CONFLICT ("keyHash") DO UPDATE SET
          "scope" = EXCLUDED."scope",
          "attempts" = CASE
            WHEN "AuthRateLimit"."expiresAt" <= EXCLUDED."windowStartedAt" THEN 1
            ELSE "AuthRateLimit"."attempts" + 1
          END,
          "windowStartedAt" = CASE
            WHEN "AuthRateLimit"."expiresAt" <= EXCLUDED."windowStartedAt"
              THEN EXCLUDED."windowStartedAt"
            ELSE "AuthRateLimit"."windowStartedAt"
          END,
          "expiresAt" = CASE
            WHEN "AuthRateLimit"."expiresAt" <= EXCLUDED."windowStartedAt"
              THEN EXCLUDED."expiresAt"
            ELSE "AuthRateLimit"."expiresAt"
          END,
          "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "attempts", "expiresAt"
      `;

      if (!row) throw new Error("Auth rate limit update returned no row");
      consumed.push({ ...row, limit: entry.limit, keyHash: entry.keyHash });
    }

    await tx.$executeRaw`
      WITH expired AS (
        SELECT "keyHash"
        FROM "AuthRateLimit"
        WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt" ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "AuthRateLimit" AS target
      USING expired
      WHERE target."keyHash" = expired."keyHash"
    `;

    return consumed;
  });

  const blocked = rows.filter((row) => row.attempts > row.limit);
  return {
    allowed: blocked.length === 0,
    keyHashes: rows.map((row) => row.keyHash),
    retryAfterSeconds:
      blocked.length === 0
        ? 0
        : Math.max(...blocked.map((row) => secondsUntil(row.expiresAt, now))),
  };
}

export function consumeLoginRateLimits(
  request: Pick<Request, "headers">,
  email: unknown
): Promise<AuthRateLimitDecision> {
  return consumeAuthRateLimits({
    request,
    email,
    scope: "credentials_login",
    policies: LOGIN_POLICIES,
  });
}

export function consumeRegistrationRateLimits(
  request: Pick<Request, "headers">,
  email: unknown
): Promise<AuthRateLimitDecision> {
  return consumeAuthRateLimits({
    request,
    email,
    scope: "registration",
    policies: REGISTRATION_POLICIES,
  });
}

export async function resetAuthRateLimits(keyHashes: string[]): Promise<void> {
  if (keyHashes.length === 0) return;
  await prisma.authRateLimit.deleteMany({
    where: { keyHash: { in: keyHashes } },
  });
}
