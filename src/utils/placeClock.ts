import { localDateKey, placeWallClock, placeWallClockInstant, type ThithiPlace } from "../thithiCalendar/calendar";
import { placeForCoords } from "../thithiCalendar/dailyThithi";
import type { GeoCoords } from "./location";

/**
 * The selected place's clock. The app's selected date/time is a real instant; the date card shows and
 * reads it on this clock, and every displayed sunrise/sunset/jamam time is formatted on it.
 * `coords === null` is the device's own zone (the no-location default).
 */

const MAX_CACHED_PLACES = 8;
const places = new Map<string, ThithiPlace>();

/** Place (IANA zone) for coords, memoised. */
export function placeOf(coords: GeoCoords | null): ThithiPlace {
  const key = coords ? `${coords.lat},${coords.lng}` : "device";
  let place = places.get(key);
  if (!place) {
    if (places.size >= MAX_CACHED_PLACES) places.delete(places.keys().next().value!);
    place = placeForCoords(coords);
    places.set(key, place);
  }
  return place;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `HH:MM` (or `HH:MM:SS`), 24 h, on the place's wall clock — the one formatter for displayed times. */
export function formatPlaceClock(place: ThithiPlace, time: Date, withSeconds = false): string {
  const { hour, minute, second } = placeWallClock(place, time);
  return withSeconds ? `${pad(hour)}:${pad(minute)}:${pad(second)}` : `${pad(hour)}:${pad(minute)}`;
}

/** {@link formatPlaceClock} for the selected location's coords. */
export function formatClock(time: Date, coords: GeoCoords | null, withSeconds = false): string {
  return formatPlaceClock(placeOf(coords), time, withSeconds);
}

/** The place's civil date (`YYYY-MM-DD`) at `time`. */
export function placeDateKey(time: Date, coords: GeoCoords | null): string {
  return localDateKey(placeOf(coords), time);
}

/** Weekday (0 = Sunday) of a `YYYY-MM-DD` civil date. */
export function dateKeyWeekday(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

/** The place's weekday at `time`. */
export function placeWeekday(time: Date, coords: GeoCoords | null): number {
  return dateKeyWeekday(placeDateKey(time, coords));
}

/** Date card inputs for `time`: the place's `YYYY-MM-DD` and `HH:MM`. */
export function placeInputValues(time: Date, coords: GeoCoords | null): { date: string; time: string } {
  return { date: placeDateKey(time, coords), time: formatClock(time, coords) };
}

/**
 * The instant of a wall-clock date and time at the place (what the user typed into the date card).
 * A time skipped by a DST jump moves forward by the jump (London 01:30 on spring-forward day → 02:30 BST);
 * a time repeated when clocks go back is its first (summer-time) occurrence.
 */
export function placeInputInstant(dateKey: string, hhmm: string, coords: GeoCoords | null): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return wallClockInstant(placeOf(coords), dateKey, (hours * 60 + minutes) * 60_000);
}

/** Same wall-clock time at the place, moved to another civil date. */
export function withPlaceDate(time: Date, dateKey: string, coords: GeoCoords | null): Date {
  const { hour, minute, second } = placeWallClock(placeOf(coords), time);
  const ms = ((time.getTime() % 1000) + 1000) % 1000;
  return wallClockInstant(placeOf(coords), dateKey, ((hour * 60 + minute) * 60 + second) * 1000 + ms);
}

const DAY_MS = 86_400_000;

function wallClockInstant(place: ThithiPlace, dateKey: string, msOfDay: number): Date {
  const wall = Date.parse(`${dateKey}T00:00:00Z`) + msOfDay;
  // Offsets either side of any clock change that day (changes are months apart).
  const before = offsetMinutesAt(place, new Date(wall - DAY_MS));
  const after = offsetMinutesAt(place, new Date(wall + DAY_MS));
  const shows = (time: number) => {
    const clock = placeWallClock(place, new Date(time));
    return Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second) ===
      Math.floor(wall / 1000) * 1000;
  };
  const matches = [wall - before * 60_000, wall - after * 60_000].filter(shows).sort((a, b) => a - b);
  if (matches.length) return new Date(matches[0]);
  if (before === after) return placeWallClockInstant(place, dateKey, msOfDay);
  // Skipped by the change: read on the old offset, i.e. moved forward by the jump.
  return new Date(wall - before * 60_000);
}

function offsetMinutesAt(place: ThithiPlace, time: Date): number {
  const wall = placeWallClock(place, time);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return Math.round((asUtc - Math.floor(time.getTime() / 1000) * 1000) / 60_000);
}

/** `GMT+1`, `GMT−4`, `GMT+5:30`, `GMT`. */
function gmtOffsetLabel(minutes: number): string {
  if (minutes === 0) return "GMT";
  const abs = Math.abs(minutes);
  const sign = minutes < 0 ? "−" : "+";
  const rest = abs % 60;
  return `GMT${sign}${Math.floor(abs / 60)}${rest ? `:${pad(rest)}` : ""}`;
}

/**
 * Zone note for times shown at `time`, e.g. `Europe/London · GMT+1` — `null` when the place keeps the
 * device's clock at that moment (or there is no location), so local places show no label.
 */
export function placeZoneLabel(coords: GeoCoords | null, time: Date): string | null {
  if (!coords) return null;
  const place = placeOf(coords);
  const offset = offsetMinutesAt(place, time);
  if (offset === -time.getTimezoneOffset()) return null;
  const gmt = gmtOffsetLabel(offset);
  return place.timeZone ? `${place.timeZone} · ${gmt}` : gmt;
}
