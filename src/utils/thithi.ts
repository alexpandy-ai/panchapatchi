import { PATCHI_ORDER } from "./bilingual";
import type { GeoCoords } from "./location";
import { getMoonPhase, getPakshaFromDate, type PakshaId } from "./paksha";
import { getNextSunrise, getSunrise, getSunset } from "./sunrise";
import {
  getThithiCellPosition,
  getThithiPlanetDay,
  getThithiPlanetWeekday,
  THITHI_NUMBERS_BY_GROUP,
  THITHI_PATCHI_BY_PAKSHA,
} from "./thithiPatchi";
import type { Bilingual } from "./bilingual";

export type ThithiPatchiEntry = {
  thithi: Bilingual;
  patchi: (typeof PATCHI_ORDER)[number];
  day: Bilingual;
  weekday: number;
  groupIndex: number;
  thithiIndex: number;
  thithiNumber: number;
  pakshaId: PakshaId;
};

/**
 * Night window used for Home / Find Patchi Night Thithi:
 * sunset → next sunrise. Before today's sunrise, that is yesterday's sunset.
 */
export function getNightThithiWindow(
  date: Date,
  coords: GeoCoords | null,
): { sunset: Date; nextSunrise: Date } {
  const sunrise = getSunrise(date, coords);
  if (date < sunrise) {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    return { sunset: getSunset(previousDay, coords), nextSunrise: sunrise };
  }
  return { sunset: getSunset(date, coords), nextSunrise: getNextSunrise(sunrise, coords) };
}

/**
 * Reference instant for Home “Night Thithi”: sunset that starts the night window.
 */
export function getNightThithiReferenceDate(
  date: Date,
  coords: GeoCoords | null,
): Date {
  return getNightThithiWindow(date, coords).sunset;
}

function thithiEntryAt(moment: Date): ThithiPatchiEntry {
  return getThithiPatchiEntryForDate(moment, getPakshaFromDate(moment));
}

function isSameThithiEntry(a: ThithiPatchiEntry, b: ThithiPatchiEntry): boolean {
  return a.thithiNumber === b.thithiNumber && a.pakshaId === b.pakshaId;
}

export interface CurrentThithiPosition {
  groupIndex: number;
  thithiIndex: number;
  thithiNumber: number;
  pakshaId: PakshaId;
}

/** Lunar day 1–15 within the current paksha (approximate, from moon phase). */
export function getThithiNumberInPaksha(date: Date): number {
  const phase = getMoonPhase(date);
  const raw =
    phase < 0.5 ? Math.floor(phase * 30) + 1 : Math.floor((phase - 0.5) * 30) + 1;
  return Math.min(15, Math.max(1, raw));
}

export function getCurrentThithiPosition(date: Date): CurrentThithiPosition {
  const thithiNumber = getThithiNumberInPaksha(date);
  const { groupIndex, thithiIndex } = getThithiCellPosition(thithiNumber);

  return {
    groupIndex,
    thithiIndex,
    thithiNumber,
    pakshaId: getPakshaFromDate(date),
  };
}

export function isCurrentThithiRow(
  date: Date,
  groupIndex: number,
  thithiIndex: number,
): boolean {
  const current = getCurrentThithiPosition(date);
  return current.groupIndex === groupIndex && current.thithiIndex === thithiIndex;
}

/** Today's thithi name and athikara patchi from the Thithi Patchi table. */
export function getThithiPatchiEntryForDate(
  date: Date,
  pakshaId: PakshaId,
): ThithiPatchiEntry {
  const thithiNumber = getThithiNumberInPaksha(date);
  return getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber);
}

/**
 * Home / Find Patchi Night Thithi: moon phase at sunset, unless that night
 * (sunset → next sunrise) contains two different thithis — then use the next
 * thithi after the one in force at sunset (the previous day's thithi).
 */
export function getNightThithiPatchiEntryForDate(
  date: Date,
  coords: GeoCoords | null,
): ThithiPatchiEntry {
  const { sunset, nextSunrise } = getNightThithiWindow(date, coords);
  const sunsetEntry = thithiEntryAt(sunset);
  const dawnEntry = thithiEntryAt(new Date(nextSunrise.getTime() - 1));
  if (isSameThithiEntry(sunsetEntry, dawnEntry)) return sunsetEntry;
  return getNextThithiPatchiEntry(sunsetEntry.pakshaId, sunsetEntry.thithiNumber);
}

/** Thithi Patchi row for a paksha + lunar day 1–15. */
export function getThithiPatchiEntryForThithiNumber(
  pakshaId: PakshaId,
  thithiNumber: number,
): ThithiPatchiEntry {
  const clamped = Math.min(15, Math.max(1, thithiNumber));
  const { groupIndex, thithiIndex } = getThithiCellPosition(clamped);
  const group = THITHI_PATCHI_BY_PAKSHA[pakshaId][groupIndex];

  return {
    thithi: group.thithis[thithiIndex],
    patchi: group.patchi,
    day: getThithiPlanetDay(group.planet),
    weekday: getThithiPlanetWeekday(group.planet),
    groupIndex,
    thithiIndex,
    thithiNumber: clamped,
    pakshaId,
  };
}

/**
 * Next Thithi Patchi day after the current lunar day — used for night Anthara rows 6–10
 * (next morning day jamams). At thithi 15, continues into the other pirai’s Prathamai.
 */
export function getNextThithiPatchiEntryForDate(
  date: Date,
  pakshaId: PakshaId,
): ThithiPatchiEntry {
  const thithiNumber = getThithiNumberInPaksha(date);
  return getNextThithiPatchiEntry(pakshaId, thithiNumber);
}

/** Next Thithi Patchi schedule after a given thithi number in a pirai. */
export function getNextThithiPatchiEntry(
  pakshaId: PakshaId,
  thithiNumber: number,
): ThithiPatchiEntry {
  if (thithiNumber < 15) {
    return getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber + 1);
  }
  const nextPaksha: PakshaId = pakshaId === "valarpirai" ? "theipirai" : "valarpirai";
  return getThithiPatchiEntryForThithiNumber(nextPaksha, 1);
}

/**
 * Next morning schedule after a Thithi Patchi planet-day (weekday) in a pirai.
 * Uses the last thithi on that day-row, then steps to the next thithi entry.
 */
export function getNextThithiPatchiEntryAfterWeekday(
  pakshaId: PakshaId,
  weekday: number,
): ThithiPatchiEntry | null {
  const groups = THITHI_PATCHI_BY_PAKSHA[pakshaId];
  const groupIndex = groups.findIndex(
    (group) => getThithiPlanetWeekday(group.planet) === weekday,
  );
  if (groupIndex < 0) return null;
  const lastThithiNumber = THITHI_NUMBERS_BY_GROUP[groupIndex]?.[2];
  if (lastThithiNumber == null) return null;
  return getNextThithiPatchiEntry(pakshaId, lastThithiNumber);
}
