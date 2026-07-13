import { createHmac } from "node:crypto";

export type AuthRateLimitDimension = "email" | "ip";

const MISSING_EMAIL = "missing";
const UNKNOWN_CLIENT = "unknown";

export function normalizeRateLimitEmail(email: unknown): string {
  if (typeof email !== "string") return MISSING_EMAIL;
  return email.trim().toLowerCase().slice(0, 254) || MISSING_EMAIL;
}

export function clientIpFromRequest(
  request: Pick<Request, "headers">
): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedClient = forwardedFor
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean);
  const candidate =
    forwardedClient || request.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;

  return candidate.toLowerCase().slice(0, 128) || UNKNOWN_CLIENT;
}

export function hashAuthRateLimitKey({
  scope,
  dimension,
  identifier,
  secret,
}: {
  scope: string;
  dimension: AuthRateLimitDimension;
  identifier: string;
  secret: string;
}): string {
  if (!secret) throw new Error("Auth rate limit secret is not configured");

  return createHmac("sha256", secret)
    .update(`${scope}\0${dimension}\0${identifier}`)
    .digest("hex");
}

export function secondsUntil(expiresAt: Date, now = new Date()): number {
  return Math.max(
    1,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)
  );
}
