import * as Astronomy from "astronomy-engine";
import { placeWallClock, placeWallClockInstant, type ThithiPlace } from "../thithiCalendar/calendar";
import { cardDateKey, placeForCoords } from "../thithiCalendar/dailyThithi";
import { formatTime } from "./jamam";
import type { GeoCoords } from "./location";
import { getSunrise } from "./sunrise";

const DAY_MS = 86_400_000;

export type MorningSunId = "astronomical" | "nautical" | "civil" | "sunrise";

/** A place with coordinates; times are read on its civil date and wall clock. */
export type SunPlace = ThithiPlace & { coords: NonNullable<ThithiPlace["coords"]> };

/** Geometric altitude of the Sun's centre, in degrees, for each morning event (earliest first). */
export const MORNING_SUN_ALTITUDES: readonly { id: MorningSunId; altitude: number }[] = [
  { id: "astronomical", altitude: -18 },
  { id: "nautical", altitude: -12 },
  { id: "civil", altitude: -6 },
  { id: "sunrise", altitude: 0 },
];

function nextDateKey(dateKey: string): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * When the Sun's centre rises through `altitude` (geometric, no refraction) on the place's civil date
 * `dateKey`; `null` when it does not cross that altitude upwards between local midnights.
 */
export function morningSunAltitudeTime(place: SunPlace, dateKey: string, altitude: number): Date | null {
  const start = placeWallClockInstant(place, dateKey, 0);
  const end = placeWallClockInstant(place, nextDateKey(dateKey), 0);
  const found = Astronomy.SearchAltitude(
    Astronomy.Body.Sun,
    new Astronomy.Observer(place.coords.lat, place.coords.lng, 0),
    1,
    start,
    (end.getTime() - start.getTime()) / DAY_MS,
    altitude,
  );
  return found && found.date.getTime() < end.getTime() ? found.date : null;
}

export function morningSunTimes(
  place: SunPlace,
  dateKey: string,
): { id: MorningSunId; altitude: number; time: Date | null }[] {
  return MORNING_SUN_ALTITUDES.map((entry) => ({
    ...entry,
    time: morningSunAltitudeTime(place, dateKey, entry.altitude),
  }));
}

/** `HH:MM` (24 h) on the place's wall clock, seconds dropped like the app's other times. */
export function formatPlaceClock(place: ThithiPlace, time: Date): string {
  const { hour, minute } = placeWallClock(place, time);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Sunrise shown in the date card: the Sunrise page's 0° time for the card's date at the place.
 * Display only — jamam and thithi calculations keep `getSunrise` (−0.833°).
 * Without coords it shows the app's fixed 06:00 default; "—" when 0° is not reached that day.
 */
export function dateCardSunrise(selected: Date, coords: GeoCoords | null): string {
  if (!coords) return formatTime(getSunrise(selected, null));
  const place = placeForCoords(coords) as SunPlace;
  const time = morningSunAltitudeTime(place, cardDateKey(selected), 0);
  return time ? formatPlaceClock(place, time) : "—";
}
