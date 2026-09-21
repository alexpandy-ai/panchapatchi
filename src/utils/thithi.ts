import { PATCHI_ORDER } from "./bilingual";
import {
  getMorningDieNightEatDayForPatchi,
  getMorningDieNightEatWeekdayForPatchi,
} from "./alternateCalculation";
import type { PeriodId } from "./jamam";
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
  /** Day Scheduler day in brackets under Athikara Patchi (Die-morning / Eat-night). */
  athikaraDay: Bilingual;
  athikaraWeekday: number;
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

/** Thithi Patchi row at an instant, using that instant’s paksha (pirai). */
export function thithiEntryAt(moment: Date): ThithiPatchiEntry {
  return getThithiPatchiEntryForDate(moment, getPakshaFromDate(moment));
}

/**
 * Planet-day for a thithi is always read from that thithi’s pirai table.
 * Valarpirai and Theipirai map the same lunar day to different weekdays/birds.
 */
export function thithiEntryForPirai(
  pakshaId: PakshaId,
  thithiNumber: number,
): ThithiPatchiEntry {
  return getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber);
}

/**
 * Next-morning Thithi for night Anthara / Naal rows 6–10.
 * Same pirai: keep that pirai’s table for the sunrise thithi.
 * End of pirai (thithi 15) or sunrise already in the other pirai: use the
 * next pirai’s Prathamai Athikara Patchi bracket day from that pirai’s table.
 */
export function nextMorningThithiForAnthara(
  originalThithi: ThithiPatchiEntry,
  sunriseThithi: ThithiPatchiEntry,
): ThithiPatchiEntry {
  if (sunriseThithi.pakshaId !== originalThithi.pakshaId) {
    return thithiEntryForPirai(sunriseThithi.pakshaId, sunriseThithi.thithiNumber);
  }
  if (originalThithi.thithiNumber === 15) {
    return getNextThithiPatchiEntry(originalThithi.pakshaId, 15);
  }
  return thithiEntryForPirai(originalThithi.pakshaId, sunriseThithi.thithiNumber);
}

/** Sunrise that ends the night window containing `nightInstant`. */
export function getNextMorningDateAfterNight(
  nightInstant: Date,
  coords: GeoCoords | null,
): Date {
  return getNightThithiWindow(nightInstant, coords).nextSunrise;
}

export interface NextMorningThithiContext {
  selectedJamamType: PeriodId;
  originalDate: Date;
  originalThithi: ThithiPatchiEntry;
  nextMorningDate: Date;
  nextMorningThithi: ThithiPatchiEntry;
}

/**
 * Night jamam → next morning’s date and Thithi.
 * Uses the sunrise that closes the night window, then the Thithi and pirai
 * in force for that morning (same pirai, overnight thithi, or pirai change
 * at Pournami/Amavasai). Planet-day is always taken from that pirai’s table.
 * Does not add one calendar day and does not blindly increment thithi number.
 */
export function resolveNextMorningThithiContext(
  nightInstant: Date,
  coords: GeoCoords | null,
): NextMorningThithiContext {
  const originalThithi = getNightThithiPatchiEntryForDate(nightInstant, coords);
  const nextMorningDate = getNextMorningDateAfterNight(nightInstant, coords);
  const sunriseThithi = thithiEntryAt(nextMorningDate);
  const nextMorningThithi = nextMorningThithiForAnthara(originalThithi, sunriseThithi);
  return {
    selectedJamamType: "night",
    originalDate: nightInstant,
    originalThithi,
    nextMorningDate,
    nextMorningThithi,
  };
}

function thithiDebugFields(entry: ThithiPatchiEntry) {
  return {
    pakshaId: entry.pakshaId,
    thithiNumber: entry.thithiNumber,
    thithi: { ta: entry.thithi.ta, en: entry.thithi.en },
    weekday: entry.weekday,
    day: { ta: entry.day.ta, en: entry.day.en },
    patchi: entry.patchi,
    athikaraWeekday: entry.athikaraWeekday,
    athikaraDay: { ta: entry.athikaraDay.ta, en: entry.athikaraDay.en },
  };
}

/** Browser console debug for Antharam / Naal night → next-morning flow. */
export function logAntharaThithiDebug(payload: {
  selectedJamamType: PeriodId;
  originalDate: Date;
  originalThithi: ThithiPatchiEntry;
  nextMorningDate?: Date | null;
  nextMorningThithi?: ThithiPatchiEntry | null;
  finalActivity?: string | string[] | null;
}): void {
  const piraiChanged =
    payload.nextMorningThithi != null &&
    payload.nextMorningThithi.pakshaId !== payload.originalThithi.pakshaId;
  console.info("[Antharam]", {
    selectedJamamType: payload.selectedJamamType,
    originalDate: payload.originalDate.toISOString(),
    originalThithi: thithiDebugFields(payload.originalThithi),
    nextMorningDate: payload.nextMorningDate?.toISOString() ?? null,
    nextMorningThithi: payload.nextMorningThithi
      ? thithiDebugFields(payload.nextMorningThithi)
      : null,
    piraiChanged,
    finalActivity: payload.finalActivity ?? null,
  });
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

  const planetDay = getThithiPlanetDay(group.planet);
  const planetWeekday = getThithiPlanetWeekday(group.planet);
  const athikaraWeekday =
    getMorningDieNightEatWeekdayForPatchi(pakshaId, group.patchi) ?? planetWeekday;
  const athikaraDay =
    getMorningDieNightEatDayForPatchi(pakshaId, group.patchi) ?? planetDay;

  return {
    thithi: group.thithis[thithiIndex],
    patchi: group.patchi,
    day: planetDay,
    weekday: planetWeekday,
    athikaraDay,
    athikaraWeekday,
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
