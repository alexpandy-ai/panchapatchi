import {
  ALTERNATE_ANTHARA_SEGMENT_COUNT,
  ALTERNATE_WEEKDAY_ORDER,
  getAlternateDayActivity,
  getAlternateNightActivity,
} from "./alternateCalculation";
import {
  antharaSegmentWindow,
  buildJamamAntharaClick,
  getPatchiAntharaMatrix,
  type JamamAntharaClickModel,
  type PatchiAntharaColumn,
} from "./anthara";
import { bi, PATCHI_ORDER, patchiBaseName, type Bilingual } from "./bilingual";
import {
  getFullDayJamamSchedule,
  yamaFromJamamIndex,
  type JamamSlot,
  type PeriodId,
} from "./jamam";
import type { GeoCoords } from "./location";
import type { PakshaId } from "./paksha";
import {
  getThithiHeadingsForScheduleWeekday,
  getThithiScheduleActivityWeekday,
  type ThithiPatchiEntry,
} from "./thithi";
import {
  getThithiCellPosition,
  getThithiPlanetWeekday,
  THITHI_PATCHI_BY_PAKSHA,
} from "./thithiPatchi";

export type ThithiScheduleBird = (typeof PATCHI_ORDER)[number];

/**
 * Thithi Schedule → Schedule row (planet weekday) whose heading lists this Pirai's thithi.
 * Null when the thithi's group is not a schedule row.
 */
export function thithiScheduleRowWeekday(pakshaId: PakshaId, thithiNumber: number): number | null {
  if (!Number.isInteger(thithiNumber) || thithiNumber < 1 || thithiNumber > 15) return null;
  const group = THITHI_PATCHI_BY_PAKSHA[pakshaId][getThithiCellPosition(thithiNumber).groupIndex];
  if (!group) return null;
  const weekday = getThithiPlanetWeekday(group.planet);
  return getThithiHeadingsForScheduleWeekday(pakshaId, weekday) === group.thithis ? weekday : null;
}

/** Pancha day whose activities fill a Thithi Schedule row. */
export function thithiScheduleActivityWeekday(pakshaId: PakshaId, rowWeekday: number): number {
  return getThithiScheduleActivityWeekday(pakshaId, rowWeekday) ?? rowWeekday;
}

/** One schedule cell: the bird's activity (Tamil id) for a weekday / yama / day-or-night. */
export function thithiScheduleBirdActivity(
  pakshaId: PakshaId,
  activityWeekday: number,
  yama: number,
  period: PeriodId,
  bird: ThithiScheduleBird,
): string | null {
  return period === "day"
    ? getAlternateDayActivity(pakshaId, activityWeekday, yama, bird)
    : getAlternateNightActivity(pakshaId, activityWeekday, yama, bird);
}

/** Bird doing `activity` (Tamil id, e.g. ஊண் / சாவு) in one jamam of the Schedule row for this Pirai / thithi. */
export function thithiScheduleBirdDoing(
  pakshaId: PakshaId,
  thithiNumber: number,
  yama: number,
  period: PeriodId,
  activity: string,
): ThithiScheduleBird | null {
  const rowWeekday = thithiScheduleRowWeekday(pakshaId, thithiNumber);
  if (rowWeekday === null) return null;
  const activityWeekday = thithiScheduleActivityWeekday(pakshaId, rowWeekday);
  return (
    PATCHI_ORDER.find(
      (bird) => thithiScheduleBirdActivity(pakshaId, activityWeekday, yama, period, bird) === activity,
    ) ?? null
  );
}

/** Bird doing `activity` (Tamil id, e.g. ஊண் / சாவு) in Jamam 1 morning of the Schedule row for this Pirai / thithi. */
export function thithiScheduleJamam1Bird(
  pakshaId: PakshaId,
  thithiNumber: number,
  activity: string,
): ThithiScheduleBird | null {
  return thithiScheduleBirdDoing(pakshaId, thithiNumber, 1, "day", activity);
}

/** Schedule rows (planet weekdays) where `bird` eats (ஊண்) in Jamam 1 of the Day and in Jamam 1 of the Night. */
export function thithiScheduleEatingRowWeekdays(
  pakshaId: PakshaId,
  bird: ThithiScheduleBird,
): Record<PeriodId, number | null> {
  const rowFor = (period: PeriodId) =>
    ALTERNATE_WEEKDAY_ORDER.find(
      (weekday) =>
        thithiScheduleBirdActivity(
          pakshaId,
          thithiScheduleActivityWeekday(pakshaId, weekday),
          1,
          period,
          bird,
        ) === "ஊண்",
    ) ?? null;
  return { day: rowFor("day"), night: rowFor("night") };
}

/** Jamams of the sunrise-to-sunrise cycle containing `moment`, and the active one (start-inclusive, end-exclusive). */
export function thithiScheduleActiveJamam(
  moment: Date,
  coords: GeoCoords | null,
): { jamamSlot: JamamSlot; allJamamSlots: JamamSlot[] } {
  const allJamamSlots = getFullDayJamamSchedule(moment, coords).all;
  return { jamamSlot: allJamamSlots.find((slot) => slot.isActive) ?? allJamamSlots[0], allJamamSlots };
}

export interface ThithiScheduleDayFacts {
  /** Eats (ஊண்) in Jamam 1 morning. */
  athikara: ThithiScheduleBird;
  /** Dies (சாவு) in Jamam 1 morning. */
  padu: ThithiScheduleBird | null;
}

/** Home Athikara and Padu, both read from the Thithi Schedule row for this Pirai / thithi. */
export function thithiScheduleDayFacts(
  pakshaId: PakshaId,
  thithiNumber: number,
): ThithiScheduleDayFacts | null {
  const athikara = thithiScheduleJamam1Bird(pakshaId, thithiNumber, "ஊண்");
  if (!athikara) return null;
  return {
    athikara,
    padu: thithiScheduleJamam1Bird(pakshaId, thithiNumber, "சாவு"),
  };
}

export type ThithiScheduleMissReason =
  | "noScheduleRow"
  | "noJamamActivity"
  | "noAntharaActivity";

export const THITHI_SCHEDULE_MISS: Record<ThithiScheduleMissReason, Bilingual> = {
  noScheduleRow: bi(
    "இந்தப் பிறை / திதிக்கு திதி அட்டவணையில் வரிசை இல்லை",
    "No Thithi Schedule row for this Pirai / Thithi",
  ),
  noJamamActivity: bi(
    "இந்த ஜாமத்தில் இந்தப் பட்சிக்கு திதி அட்டவணைச் செயல் இல்லை",
    "No Thithi Schedule activity for this bird in this jamam",
  ),
  noAntharaActivity: bi(
    "இந்த அந்தரத்தில் இந்தப் பட்சிக்கு திதி அட்டவணைச் செயல் இல்லை",
    "No Thithi Schedule activity for this bird in this antharam",
  ),
};

export interface ThithiScheduleBirdNowInput {
  pakshaId: PakshaId;
  thithiNumber: number;
  bird: ThithiScheduleBird;
  moment: Date;
  coords: GeoCoords | null;
  /** Thithi whose next morning fills a night jamam's antharam 6–10; omitted = calculated night thithi. */
  nightThithi?: ThithiPatchiEntry;
}

export interface ThithiScheduleAntharam {
  /** 1-based antharam serial within the jamam. */
  index: number;
  column: PatchiAntharaColumn;
  start: Date;
  end: Date;
  activity: string | null;
}

export type ThithiScheduleBirdNow =
  | { status: "noScheduleRow" }
  | {
      status: "ok";
      rowWeekday: number;
      activityWeekday: number;
      jamamSlot: JamamSlot;
      allJamamSlots: JamamSlot[];
      yama: number;
      period: PeriodId;
      jamamActivity: string | null;
      antharam: ThithiScheduleAntharam;
      antharaClick: JamamAntharaClickModel;
    };

/**
 * The clicked bird's active jamam and antharam on the Thithi Schedule for a Pirai / thithi,
 * using the sunrise-to-sunrise cycle containing `moment` (start-inclusive, end-exclusive).
 */
export function thithiScheduleBirdNow(input: ThithiScheduleBirdNowInput): ThithiScheduleBirdNow {
  const { pakshaId, thithiNumber, bird, moment, coords, nightThithi } = input;
  const rowWeekday = thithiScheduleRowWeekday(pakshaId, thithiNumber);
  if (rowWeekday === null) return { status: "noScheduleRow" };
  const activityWeekday = thithiScheduleActivityWeekday(pakshaId, rowWeekday);

  const { jamamSlot, allJamamSlots } = thithiScheduleActiveJamam(moment, coords);
  const { yama, period } = yamaFromJamamIndex(jamamSlot.index);
  const jamamActivity = thithiScheduleBirdActivity(pakshaId, activityWeekday, yama, period, bird);

  const antharaClick = buildJamamAntharaClick({
    period,
    pakshaId,
    weekday: activityWeekday,
    jamamInstant: jamamSlot.start,
    coords,
    allJamamSlots,
    nightThithi,
  });
  const matrix = getPatchiAntharaMatrix(
    jamamSlot.start,
    jamamSlot.end,
    antharaClick.getActivitySlots,
    jamamSlot.index,
    ALTERNATE_ANTHARA_SEGMENT_COUNT,
    antharaClick.matrixOptions,
  );
  let segmentIndex = 0;
  matrix.columns.forEach((column, index) => {
    if (column.startTime.getTime() <= moment.getTime()) segmentIndex = index;
  });
  const { start, end } = antharaSegmentWindow(matrix.columns, segmentIndex, jamamSlot.end);
  const wanted = patchiBaseName(bird);
  const raw = matrix.rows.find((row) => patchiBaseName(row.patchi) === wanted)?.activities[
    segmentIndex
  ];

  return {
    status: "ok",
    rowWeekday,
    activityWeekday,
    jamamSlot,
    allJamamSlots,
    yama,
    period,
    jamamActivity,
    antharam: {
      index: segmentIndex + 1,
      column: matrix.columns[segmentIndex],
      start,
      end,
      activity: raw && raw !== "—" ? raw : null,
    },
    antharaClick,
  };
}
