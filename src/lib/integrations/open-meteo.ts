import { parseSourceTimestamp } from "./freshness";

export function openMeteoObservedAt(
  localTime: unknown,
  utcOffsetSeconds: unknown
): Date | null {
  if (
    typeof localTime !== "string" ||
    typeof utcOffsetSeconds !== "number" ||
    !Number.isFinite(utcOffsetSeconds) ||
    Math.abs(utcOffsetSeconds) > 24 * 60 * 60
  ) {
    return null;
  }

  const localAsUtc = Date.parse(`${localTime}Z`);
  if (!Number.isFinite(localAsUtc)) return null;
  return parseSourceTimestamp(localAsUtc - utcOffsetSeconds * 1000);
}
