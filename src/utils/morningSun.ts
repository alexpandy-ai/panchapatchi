import { searchSunAltitude, SUN_HORIZON_ALTITUDE, type ThithiPlace } from "../thithiCalendar/calendar";

export type MorningSunId = "astronomical" | "nautical" | "civil" | "sunrise";

/** A place with coordinates; times are read on its civil date and wall clock. */
export type SunPlace = ThithiPlace & { coords: NonNullable<ThithiPlace["coords"]> };

/** Geometric altitude of the Sun's centre, in degrees, for each morning event (earliest first). */
export const MORNING_SUN_ALTITUDES: readonly { id: MorningSunId; altitude: number }[] = [
  { id: "astronomical", altitude: -18 },
  { id: "nautical", altitude: -12 },
  { id: "civil", altitude: -6 },
  { id: "sunrise", altitude: SUN_HORIZON_ALTITUDE },
];

/**
 * When the Sun's centre rises through `altitude` (geometric, no refraction) on the place's civil date
 * `dateKey`; `null` when it does not cross that altitude upwards between local midnights.
 */
export function morningSunAltitudeTime(place: SunPlace, dateKey: string, altitude: number): Date | null {
  return searchSunAltitude(place, dateKey, 1, altitude);
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

export { formatPlaceClock } from "./placeClock";
