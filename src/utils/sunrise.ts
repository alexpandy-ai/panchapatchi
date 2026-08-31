import * as SunCalc from "suncalc";
import type { GeoCoords } from "./location";

export const FIXED_SUNRISE_HOUR = 6;

/** Use local noon so SunCalc picks the correct calendar day across time zones. */
function atLocalNoon(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

function requireTime(value: Date | null, label: string): Date {
  if (!value) {
    throw new Error(`Could not calculate ${label} for the given date and location.`);
  }
  return value;
}

function fixedSunriseOnDate(date: Date): Date {
  const sunrise = new Date(date);
  sunrise.setHours(FIXED_SUNRISE_HOUR, 0, 0, 0);
  return sunrise;
}

/** `coords === null` uses a fixed 6:00 AM local sunrise (no SunCalc). */
export function getSunrise(date: Date, coords: GeoCoords | null): Date {
  if (coords === null) {
    return fixedSunriseOnDate(date);
  }
  return requireTime(
    SunCalc.getTimes(atLocalNoon(date), coords.lat, coords.lng).sunrise,
    "sunrise",
  );
}

export function getSunset(date: Date, coords: GeoCoords | null): Date {
  if (coords === null) {
    throw new Error("Sunset is not available when using the fixed 6:00 AM sunrise fallback.");
  }
  return requireTime(
    SunCalc.getTimes(atLocalNoon(date), coords.lat, coords.lng).sunset,
    "sunset",
  );
}

export function getNextSunrise(sunrise: Date, coords: GeoCoords | null): Date {
  const nextDay = new Date(sunrise);
  nextDay.setDate(nextDay.getDate() + 1);
  return getSunrise(nextDay, coords);
}
