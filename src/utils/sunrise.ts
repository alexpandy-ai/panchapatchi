import { addDays, placeSunrise, placeSunset } from "../thithiCalendar/calendar";
import type { GeoCoords } from "./location";
import { placeDateKey, placeOf } from "./placeClock";

export const FIXED_SUNRISE_HOUR = 6;
export const FIXED_SUNSET_HOUR = 18;

function fixedTimeOnDate(date: Date, days: number, hour: number): Date {
  const time = new Date(date);
  time.setDate(time.getDate() + days);
  time.setHours(hour, 0, 0, 0);
  return time;
}

/**
 * Sunrise (Sun's centre at 0°) on the place's civil date of `date` (an instant), shifted by `days` civil days —
 * the single sunrise for the date card, jamams and thithis. `coords === null` uses a fixed 6:00 AM device time.
 */
export function getSunrise(date: Date, coords: GeoCoords | null, days = 0): Date {
  if (coords === null) {
    return fixedTimeOnDate(date, days, FIXED_SUNRISE_HOUR);
  }
  return placeSunrise(placeOf(coords), addDays(placeDateKey(date, coords), days));
}

/** Sunset (Sun's centre at 0°) on the place's civil date of `date`, shifted by `days`; fixed 6:00 PM without coords. */
export function getSunset(date: Date, coords: GeoCoords | null, days = 0): Date {
  if (coords === null) {
    return fixedTimeOnDate(date, days, FIXED_SUNSET_HOUR);
  }
  return placeSunset(placeOf(coords), addDays(placeDateKey(date, coords), days));
}

/** Sunrise on the place's next civil date after the one `sunrise` falls on. */
export function getNextSunrise(sunrise: Date, coords: GeoCoords | null): Date {
  return getSunrise(sunrise, coords, 1);
}

/** Sunrise on the place's civil date before the one `sunrise` falls on. */
export function getPreviousSunrise(sunrise: Date, coords: GeoCoords | null): Date {
  return getSunrise(sunrise, coords, -1);
}
