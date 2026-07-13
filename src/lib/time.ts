interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

function zonedParts(date: Date, timeZone: string): Required<ZonedDateTimeParts> {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function offsetAt(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedDateTimeToUtc(parts: ZonedDateTimeParts, timeZone: string): Date {
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0
  );
  let candidate = new Date(wallClockAsUtc);

  // The second pass handles daylight-saving offsets around the guessed instant.
  for (let pass = 0; pass < 2; pass += 1) {
    candidate = new Date(wallClockAsUtc - offsetAt(candidate, timeZone));
  }
  return candidate;
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const { year, month, day } = zonedParts(date, timeZone);
  return zonedDateTimeToUtc({ year, month, day }, timeZone);
}
