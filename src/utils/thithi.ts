import { PATCHI_ORDER } from "./bilingual";
import { getMoonPhase, getPakshaFromDate, type PakshaId } from "./paksha";
import {
  getThithiCellPosition,
  getThithiPlanetDay,
  getThithiPlanetWeekday,
  THITHI_PATCHI_BY_PAKSHA,
} from "./thithiPatchi";
import type { Bilingual } from "./bilingual";

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
): {
  thithi: Bilingual;
  patchi: (typeof PATCHI_ORDER)[number];
  day: Bilingual;
  weekday: number;
  groupIndex: number;
  thithiIndex: number;
} {
  const thithiNumber = getThithiNumberInPaksha(date);
  const { groupIndex, thithiIndex } = getThithiCellPosition(thithiNumber);
  const group = THITHI_PATCHI_BY_PAKSHA[pakshaId][groupIndex];

  return {
    thithi: group.thithis[thithiIndex],
    patchi: group.patchi,
    day: getThithiPlanetDay(group.planet),
    weekday: getThithiPlanetWeekday(group.planet),
    groupIndex,
    thithiIndex,
  };
}
