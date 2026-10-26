import { addDays, localDateKey, placeSunrise, placeSunset, type ThithiPlace } from "../thithiCalendar/calendar";
import { cardDateKey, placeForCoords } from "../thithiCalendar/dailyThithi";
import type { GeoCoords } from "./location";

export const FIXED_SUNRISE_HOUR = 6;
export const FIXED_SUNSET_HOUR = 18;

let cachedPlace: { coords: GeoCoords; place: ThithiPlace } | null = null;

function placeFor(coords: GeoCoords): ThithiPlace {
  if (cachedPlace?.coords.lat !== coords.lat || cachedPlace.coords.lng !== coords.lng) {
    cachedPlace = { coords: { lat: coords.lat, lng: coords.lng }, place: placeForCoords(coords) };
  }
  return cachedPlace.place;
}

function fixedSunriseOnDate(date: Date): Date {
  const sunrise = new Date(date);
  sunrise.setHours(FIXED_SUNRISE_HOUR, 0, 0, 0);
  return sunrise;
}

function fixedSunsetOnDate(date: Date): Date {
  const sunset = new Date(date);
  sunset.setHours(FIXED_SUNSET_HOUR, 0, 0, 0);
  return sunset;
}

/**
 * Sunrise on the date card's date (`date`'s local date parts) at the place: the Sun's centre at 0°,
 * the single sunrise for the date card, jamams and thithis. `coords === null` uses a fixed 6:00 AM.
 */
export function getSunrise(date: Date, coords: GeoCoords | null): Date {
  if (coords === null) {
    return fixedSunriseOnDate(date);
  }
  return placeSunrise(placeFor(coords), cardDateKey(date));
}

/** Sunset (Sun's centre at 0°) on the date card's date; `coords === null` uses a fixed 6:00 PM. */
export function getSunset(date: Date, coords: GeoCoords | null): Date {
  if (coords === null) {
    return fixedSunsetOnDate(date);
  }
  return placeSunset(placeFor(coords), cardDateKey(date));
}

function sunriseDaysFrom(sunrise: Date, days: number, coords: GeoCoords | null): Date {
  if (coords === null) {
    const shifted = new Date(sunrise);
    shifted.setDate(shifted.getDate() + days);
    return fixedSunriseOnDate(shifted);
  }
  const place = placeFor(coords);
  return placeSunrise(place, addDays(localDateKey(place, sunrise), days));
}

/** Sunrise on the place's next civil date after the one `sunrise` falls on. */
export function getNextSunrise(sunrise: Date, coords: GeoCoords | null): Date {
  return sunriseDaysFrom(sunrise, 1, coords);
}

/** Sunrise on the place's civil date before the one `sunrise` falls on. */
export function getPreviousSunrise(sunrise: Date, coords: GeoCoords | null): Date {
  return sunriseDaysFrom(sunrise, -1, coords);
}
