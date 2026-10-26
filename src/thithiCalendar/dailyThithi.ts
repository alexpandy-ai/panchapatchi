import type { GeoCoords } from "../utils/location";
import type { PakshaId } from "../utils/paksha";
import { offsetHoursFromLongitude, resolvePlaceZone } from "../utils/placeTimeZone";
import {
  calendarYear,
  effectiveCalculationDate,
  firstCalendarYear,
  lastCalendarYear,
  peekCalendarYear,
  type CalendarDay,
  type EffectiveCalculation,
  type ThithiPlace,
} from "./calendar";
import { piraiForSector, thithiIndexToSelection, type ThithiSelection } from "./thithiIds";

/**
 * Single source of truth for the daily thithi and Pirai shown on Home and Thithi Details.
 * Results carry stable ids only; pages translate them for display.
 */
export type DailyThithi =
  /** The effective year is not cached yet; call {@link calculateDailyThithi} off the render path. */
  | { status: "pending"; effective: EffectiveCalculation }
  | {
      status: "ready";
      effective: EffectiveCalculation;
      day: CalendarDay;
      /** Calendar index 0–29. */
      thithiIndex: number;
      selection: ThithiSelection;
    }
  /** Unnamed sector (168.75°–180° or 348.75°–360°): no thithi is assigned; needs review. */
  | { status: "unnamed"; effective: EffectiveCalculation; day: CalendarDay; adjacentPirai: PakshaId }
  /** Effective date outside 1950-01-01 … end of the current year. */
  | { status: "outOfRange"; effective: EffectiveCalculation }
  | { status: "error"; effective: EffectiveCalculation | null; detail: string };

/** Without coords the app falls back to fixed 6:00/18:00 in the device time zone. */
export function placeForCoords(coords: GeoCoords | null): ThithiPlace {
  if (!coords) {
    return {
      coords: null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      offsetMinutes: -new Date().getTimezoneOffset(),
    };
  }
  return {
    coords,
    timeZone: resolvePlaceZone(coords.lat, coords.lng).timeZone,
    offsetMinutes: offsetHoursFromLongitude(coords.lng) * 60,
  };
}

function errorDetail(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

/** `selectedDateTime` is the selected instant (the date card shows and reads it on the place's clock). */
function resolveDailyThithi(place: ThithiPlace, selectedDateTime: Date, compute: boolean): DailyThithi {
  let effective: EffectiveCalculation;
  try {
    effective = effectiveCalculationDate(place, selectedDateTime);
  } catch (caught) {
    return { status: "error", effective: null, detail: errorDetail(caught) };
  }

  const dateKey = effective.effectiveDateKey;
  const year = Number(dateKey.slice(0, 4));
  if (year < firstCalendarYear() || year > lastCalendarYear(place)) return { status: "outOfRange", effective };

  let rows: CalendarDay[] | undefined;
  try {
    rows = compute ? calendarYear(year, place) : peekCalendarYear(year, place);
  } catch (caught) {
    return { status: "error", effective, detail: errorDetail(caught) };
  }
  if (!rows) return { status: "pending", effective };

  const day = rows.find((row) => row.date === dateKey);
  if (!day) return { status: "error", effective, detail: dateKey };
  if (day.assumed === null) {
    return { status: "unnamed", effective, day, adjacentPirai: piraiForSector(day.angle / 11.25) };
  }
  return {
    status: "ready",
    effective,
    day,
    thithiIndex: day.assumed,
    selection: thithiIndexToSelection(day.assumed),
  };
}

/**
 * Daily thithi for the selected instant at a place: sunrise → next sunrise day boundary,
 * custom 32-sector mapping and sunset-based event assignment (see calendar.ts).
 * May compute a whole calendar year (~0.3–0.5 s cold); cached per place and year.
 */
export function calculateDailyThithi(place: ThithiPlace, selectedDateTime: Date): DailyThithi {
  return resolveDailyThithi(place, selectedDateTime, true);
}

/** Same as {@link calculateDailyThithi} but never computes a year; returns `pending` instead. */
export function peekDailyThithi(place: ThithiPlace, selectedDateTime: Date): DailyThithi {
  return resolveDailyThithi(place, selectedDateTime, false);
}
