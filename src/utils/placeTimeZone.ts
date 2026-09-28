import tzLookup from "tz-lookup";

export interface PlaceZone {
  /** IANA zone when lookup succeeds. */
  timeZone: string | null;
  /** Stable fragment for the monthly cache key. */
  cacheToken: string;
}

/**
 * USNO tz is east-positive hours (India is 5.5). Range is -12 through +14.
 * Half-hour and quarter-hour zones are sent as decimals (5.5, 5.75).
 */
export function formatUsnoTz(offsetHours: number): string {
  const clamped = Math.min(14, Math.max(-12, offsetHours));
  const minutes = Math.round(clamped * 60);
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `${sign}${hours}`;
  const decimal = Number((hours + mins / 60).toFixed(4));
  return `${sign}${decimal}`;
}

/** Rough offset when a coordinate falls outside the timezone map. */
export function offsetHoursFromLongitude(longitude: number): number {
  const halfHours = Math.round((longitude / 15) * 2) / 2;
  return Math.min(14, Math.max(-12, halfHours));
}

export function resolvePlaceZone(latitude: number, longitude: number): PlaceZone {
  try {
    const timeZone = tzLookup(latitude, longitude);
    return { timeZone, cacheToken: timeZone };
  } catch {
    const offset = formatUsnoTz(offsetHoursFromLongitude(longitude));
    return { timeZone: null, cacheToken: `lon${offset}` };
  }
}

function wallClockUtcMillis(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  let hour = value("hour");
  if (hour === 24) hour = 0;

  return Date.UTC(value("year"), value("month") - 1, value("day"), hour, value("minute"), value("second"));
}

/** Offset of `timeZone` at `instant`, in milliseconds (local − UTC). */
export function timeZoneOffsetMs(timeZone: string, instant: Date): number {
  return wallClockUtcMillis(timeZone, instant) - instant.getTime();
}

/**
 * UTC offset in hours at local noon on a civil date, including that zone's daylight saving.
 * USNO's `dst` flag applies U.S. daylight saving only, so callers pass this offset and omit `dst`.
 */
export function utcOffsetHoursAtLocalNoon(
  timeZone: string,
  year: number,
  month: number,
  day: number,
): number {
  const localNoonAsUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  let offsetMs = timeZoneOffsetMs(timeZone, new Date(localNoonAsUtc));
  let instant = localNoonAsUtc - offsetMs;
  offsetMs = timeZoneOffsetMs(timeZone, new Date(instant));
  instant = localNoonAsUtc - offsetMs;
  offsetMs = timeZoneOffsetMs(timeZone, new Date(instant));
  return offsetMs / 3_600_000;
}

/** Numeric tz query value for one civil date at the selected place. */
export function usnoTzForCivilDate(zone: PlaceZone, year: number, month: number, day: number): string {
  if (!zone.timeZone) {
    return zone.cacheToken.startsWith("lon") ? zone.cacheToken.slice(3) : "0";
  }
  return formatUsnoTz(utcOffsetHoursAtLocalNoon(zone.timeZone, year, month, day));
}
