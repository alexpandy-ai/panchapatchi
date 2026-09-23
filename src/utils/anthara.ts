import type { ActivitySlot } from "../types";
import { displayActivity } from "./activityLabel";
import {
  ALTERNATE_NIGHT_ACTIVITY_TA,
  alternatePakshaSupportsNight,
  getAlternateJamamActivitySlotsForThithi,
  getAntharaClickActivitySlots,
} from "./alternateCalculation";
import {
  activityBilingual,
  bi,
  JAMAM_ACTIVITY_TA,
  PANCHA_ACTIVITY_TA,
  PATCHI_ORDER,
  patchiBaseName,
  patchiLabelBilingual,
  type Bilingual,
} from "./bilingual";
import type { JamamSlot, PeriodId } from "./jamam";
import { formatTimeWithSeconds, jamamIndexForYama, splitJamamStartTimes, yamaFromJamamIndex } from "./jamam";
import type { GeoCoords } from "./location";
import { resolveNextMorningThithiContext, type NextMorningThithiContext } from "./thithi";

export const JAMAM_ANTHARA_SEGMENT_COUNT = 10;

/** Anthara sub-segments within one day jamam when night jamam rows are appended. */
export const ANTHARA_DAY_SEGMENT_COUNT = 5;

/** Anthara sub-segments within one night jamam. */
export const ANTHARA_NIGHT_SEGMENT_COUNT = 5;

export const NIGHT_JAMAM_SCHEDULE_START = 6;
export const NIGHT_JAMAM_SCHEDULE_END = 10;

/** Birds cycle in Pancha display order (same as Others / Know Patchi). */
const ANTHARA_BIRD_ORDER = PATCHI_ORDER;

/** Day uses Pancha order; night uses Day Scheduler night cycle (Die→Sleep→Rule→Walk→Eat). */
function antharaThozhilCycleOrder(period: PeriodId): readonly string[] {
  return period === "day" ? PANCHA_ACTIVITY_TA : ALTERNATE_NIGHT_ACTIVITY_TA;
}

/** Traditional duration weights (parts of 144) for day anthara sub-periods. */
const DAY_ACTIVITY_WEIGHTS: Record<string, number> = {
  சாவு: 30,
  துயில்: 12,
  அரசு: 18,
  நடை: 36,
  ஊண்: 48,
};

/** Traditional duration weights (parts of 144) for night anthara sub-periods. */
const NIGHT_ACTIVITY_WEIGHTS: Record<string, number> = {
  நடை: 42,
  சாவு: 24,
  அரசு: 18,
  ஊண்: 42,
  துயில்: 18,
};

const WEIGHT_TOTAL = 144;

export interface AntharaSlot {
  index: number;
  bird: string;
  activity: string;
  start: Date;
  end: Date;
}

function rotateFrom<T>(items: readonly T[], startValue: T): T[] {
  const startIndex = items.findIndex((item) => item === startValue);
  if (startIndex < 0) return [...items];
  return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

function cycleFrom<T>(items: readonly T[], startValue: T, count: number): T[] {
  const rotated = rotateFrom(items, startValue);
  return Array.from({ length: count }, (_, index) => rotated[index % rotated.length]);
}

/** Ten anthara activities cycling from the clicked cell's activity. */
export function antharaActivitiesFrom(
  startActivity: string,
  count = JAMAM_ANTHARA_SEGMENT_COUNT,
  activityOrder: readonly string[] = JAMAM_ACTIVITY_TA,
): string[] {
  const activity = displayActivity(startActivity);
  return cycleFrom(activityOrder, activity, count);
}

function findBirdForActivity(slots: ActivitySlot[], activity: string): string | null {
  const normalized = displayActivity(activity);
  const match = slots.find((slot) => displayActivity(slot.activity) === normalized);
  return match ? patchiBaseName(match.bird) : null;
}

/**
 * Ten anthara birds from schedule tables: first five from day jamam slots,
 * next five from night jamam slots, each matched to the anthara activity sequence.
 */
export function antharaBirdsFromJamam(
  daySlots: ActivitySlot[],
  nightSlots: ActivitySlot[],
  startActivity: string,
  count = JAMAM_ANTHARA_SEGMENT_COUNT,
  activityOrder: readonly string[] = JAMAM_ACTIVITY_TA,
): string[] {
  const activities = antharaActivitiesFrom(startActivity, count, activityOrder);
  const half = count / 2;

  return activities.map((activity, index) => {
    if (activity === "—") return "—";
    const slots = index < half ? daySlots : nightSlots;
    return findBirdForActivity(slots, activity) ?? "—";
  });
}

function activityWeights(period: PeriodId): Record<string, number> {
  return period === "day" ? DAY_ACTIVITY_WEIGHTS : NIGHT_ACTIVITY_WEIGHTS;
}

function findPatchiActivity(jamamSlots: ActivitySlot[], patchiName: string): string | null {
  const match = jamamSlots.find((slot) => patchiBaseName(slot.bird) === patchiBaseName(patchiName));
  return match ? displayActivity(match.activity) : null;
}

/** Build the five weighted anthara sub-periods within the current jamam. */
export function getAntharaSlots(
  jamamSlots: ActivitySlot[],
  patchiName: string,
  period: PeriodId,
  jamamStart: Date,
  jamamEnd: Date,
): AntharaSlot[] {
  const mainActivity = findPatchiActivity(jamamSlots, patchiName);
  const mainBird = patchiBaseName(patchiName);
  if (!mainActivity || !mainBird) return [];

  const birds = rotateFrom(ANTHARA_BIRD_ORDER, mainBird as (typeof ANTHARA_BIRD_ORDER)[number]);
  const activities = rotateFrom(antharaThozhilCycleOrder(period), mainActivity);
  const weights = activityWeights(period);
  const jamamDurationMs = jamamEnd.getTime() - jamamStart.getTime();
  if (jamamDurationMs <= 0) return [];

  let cursor = jamamStart.getTime();
  return birds.map((bird, index) => {
    const activity = activities[index];
    const weight = weights[activity] ?? WEIGHT_TOTAL / 5;
    const durationMs = (weight / WEIGHT_TOTAL) * jamamDurationMs;
    const start = new Date(cursor);
    cursor += durationMs;
    const end = new Date(cursor);
    return { index: index + 1, bird, activity, start, end };
  });
}

export function getCurrentAntharaSlot(
  slots: AntharaSlot[],
  moment: Date,
): AntharaSlot | null {
  if (slots.length === 0) return null;
  const time = moment.getTime();
  return (
    slots.find((slot) => time >= slot.start.getTime() && time < slot.end.getTime()) ??
    slots[slots.length - 1]
  );
}

/**
 * Ten-row anthara table for a jamam: same rows as JamamSegmentsPanel / JamamAntharaDialog.
 * Activities cycle from the Thozhil cell; birds come from day/night jamam schedule columns.
 */
export function getJamamAntharaRows(
  jamamStart: Date,
  jamamEnd: Date,
  thozhilActivity: string,
  dayJamamSlots: ActivitySlot[],
  nightJamamSlots: ActivitySlot[],
  period: PeriodId,
): AntharaSlot[] {
  const segmentStarts = splitJamamStartTimes(jamamStart, jamamEnd);
  const segmentCount = segmentStarts.length;
  const hasActivity = thozhilActivity !== "—" && thozhilActivity !== "";
  const activityOrder = antharaThozhilCycleOrder(period);

  const activities = hasActivity
    ? antharaActivitiesFrom(thozhilActivity, segmentCount, activityOrder)
    : Array<string>(segmentCount).fill("—");
  const birds = hasActivity
    ? antharaBirdsFromJamam(
        dayJamamSlots,
        nightJamamSlots,
        thozhilActivity,
        segmentCount,
        activityOrder,
      )
    : Array<string>(segmentCount).fill("—");

  return segmentStarts.map((start, index) => ({
    index: index + 1,
    bird: birds[index],
    activity: activities[index],
    start,
    end: index < segmentCount - 1 ? segmentStarts[index + 1] : jamamEnd,
  }));
}

export interface PatchiAntharaColumn {
  segmentIndex: number;
  startTime: Date;
  startTimeLabel: string;
  /** Appended schedule jamam row — night 6–10 or next-morning 1–5. */
  jamamIndex?: number;
  /** Appended next-day morning jamam (label as morning, not night 6–10). */
  appendedMorning?: boolean;
}

export interface PatchiAntharaMatrixOptions {
  /** Append jamams 6–10 with schedule activities after day anthara rows. */
  appendNightJamamRows?: boolean;
  /** All jamam slots (1–10) — required when appendNightJamamRows is true. */
  allJamamSlots?: JamamSlot[];
  /** Append jamams 6–10 with next-day morning schedule after night anthara rows. */
  appendNextDayMorningJamamRows?: boolean;
  /**
   * Day jamam slots (yamas 1–5) for the next Thithi morning.
   * Fills Anthara rows 6–10 on a night jamam, and Naal rows 6–10 when the
   * clicked cell is a night slice (night Anthara 1–5, or day Anthara 6–10).
   */
  getMorningJamamActivitySlots?: (yama: number) => ActivitySlot[];
  /**
   * Night jamam slots for the same next Thithi day as getMorningJamamActivitySlots —
   * used when opening Naal from next-day morning rows (Anthara 6–10).
   */
  getNextDayNightJamamActivitySlots?: (yama: number) => ActivitySlot[];
  /** Night click: resolved next-morning date/Thithi for appended rows and Naal. */
  nextMorningThithiContext?: NextMorningThithiContext;
}

/**
 * One jamam click on Home or Day Schedule.
 * `weekday` is the clicked BracketDay (Home: night thithi athikara weekday;
 * Day Schedule: the row that was clicked). Both pages must pass that into
 * this function — they must not build matrix options separately.
 */
export interface JamamAntharaClickInput {
  period: PeriodId;
  pakshaId: "valarpirai" | "theipirai";
  weekday: number;
  /** Instant inside the clicked jamam. Night Anthara 6–10 step from this night’s ThithiValue. */
  jamamInstant: Date;
  coords: GeoCoords | null;
  allJamamSlots: JamamSlot[];
}

export interface JamamAntharaClickModel {
  getActivitySlots: (yama: number, slotPeriod: PeriodId) => ActivitySlot[];
  matrixOptions: PatchiAntharaMatrixOptions | undefined;
}

/**
 * Anthara / Naal slots for a jamam click. Home and Day Schedule both call this.
 * Day: rows 1–5 are the clicked day jamam; rows 6–10 are that day’s night.
 * Naal opened from those night rows uses the next thithi’s morning BracketDay.
 * Night: rows 1–5 stay on the clicked night; rows 6–10 are the next thithi’s morning.
 * Naal opened from those morning rows stays on that morning’s night (no second step).
 */
export function buildJamamAntharaClick(input: JamamAntharaClickInput): JamamAntharaClickModel {
  const getActivitySlots = (yama: number, slotPeriod: PeriodId) =>
    getAntharaClickActivitySlots(
      { period: input.period, pakshaId: input.pakshaId, weekday: input.weekday },
      yama,
      slotPeriod,
    );

  if (!alternatePakshaSupportsNight(input.pakshaId)) {
    return { getActivitySlots, matrixOptions: undefined };
  }

  const nextMorningContext = resolveNextMorningThithiContext(input.jamamInstant, input.coords);
  const nextThithiMorning = nextMorningContext.nextMorningThithi;
  const morningSlots = (yama: number) =>
    getAlternateJamamActivitySlotsForThithi(nextThithiMorning, yama, "day");

  if (input.period === "day") {
    return {
      getActivitySlots,
      matrixOptions: {
        appendNightJamamRows: true,
        allJamamSlots: input.allJamamSlots,
        // Anthara rows 6–10 stay this night (getActivitySlots). Naal from those
        // rows uses the next thithi’s morning BracketDay.
        getMorningJamamActivitySlots: morningSlots,
      },
    };
  }

  return {
    getActivitySlots,
    matrixOptions: {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: morningSlots,
      getNextDayNightJamamActivitySlots: (yama: number) =>
        getAlternateJamamActivitySlotsForThithi(nextThithiMorning, yama, "night"),
      nextMorningThithiContext: nextMorningContext,
    },
  };
}

export interface PatchiAntharaRow {
  patchi: (typeof PATCHI_ORDER)[number];
  activities: string[];
}

export interface PatchiAntharaMatrix {
  columns: PatchiAntharaColumn[];
  rows: PatchiAntharaRow[];
}

/** Equal split segment start columns for a jamam window. */
export function getAntharaSegmentColumns(
  jamamStart: Date,
  jamamEnd: Date,
  parts = JAMAM_ANTHARA_SEGMENT_COUNT,
): PatchiAntharaColumn[] {
  const segmentStarts = splitJamamStartTimes(jamamStart, jamamEnd, parts);
  return segmentStarts.map((start, index) => ({
    segmentIndex: index,
    startTime: start,
    startTimeLabel: formatTimeWithSeconds(start),
  }));
}

function getPatchiJamamActivity(
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[],
  jamamIndex: number,
  patchi: (typeof PATCHI_ORDER)[number],
): string {
  const { yama, period } = yamaFromJamamIndex(jamamIndex);
  const slots = getActivitySlots(yama, period);
  const match = slots.find((entry) => patchiBaseName(entry.bird) === patchi);
  return match ? displayActivity(match.activity) : "—";
}

function getMorningPatchiJamamActivity(
  getMorningJamamActivitySlots: (yama: number) => ActivitySlot[],
  yama: number,
  patchi: (typeof PATCHI_ORDER)[number],
): string {
  if (yama < 1 || yama > 5) return "—";
  const slots = getMorningJamamActivitySlots(yama);
  const match = slots.find((entry) => patchiBaseName(entry.bird) === patchi);
  return match ? displayActivity(match.activity) : "—";
}

/** Yamas 1–5 rotated so `startYama` comes first, then wrap (e.g. 2 → 2,3,4,5,1). */
export function yamasRotatedFrom(startYama: number): number[] {
  return rotateFrom([1, 2, 3, 4, 5], startYama);
}

/** Night schedule jamam indices (6–10) in yama-rotated order. */
export function nightJamamIndicesRotatedFromYama(startYama: number): number[] {
  return yamasRotatedFrom(startYama).map((yama) => jamamIndexForYama(yama, "night"));
}

/** Day or night jamam indices 1–5 / 6–10, rotated from the clicked jamam. */
export function clickedPeriodJamamSerials(parentJamamIndex: number): number[] {
  const { yama, period } = yamaFromJamamIndex(parentJamamIndex);
  return yamasRotatedFrom(yama).map((rotatedYama) => jamamIndexForYama(rotatedYama, period));
}

/** Jamam in an Antharam row bracket: stored index, or clicked-period rotation. */
export function antharaColumnJamamIndex(
  column: { jamamIndex?: number; segmentIndex: number },
  parentJamamIndex: number,
): number {
  if (column.jamamIndex != null) return column.jamamIndex;
  return clickedPeriodJamamSerials(parentJamamIndex)[column.segmentIndex] ?? parentJamamIndex;
}

export interface NaalAppendResolution {
  period: PeriodId;
  /** Rows 6–10 are the next Thithi’s morning day jamams. */
  appendNextDayMorning: boolean;
  /** Rows 6–10 are that next morning’s night jamams (no further thithi step). */
  appendNextDayNight: boolean;
  /** Rows 6–10 are the same day’s night jamams. */
  appendNightJamam: boolean;
  /** Bracket labels for Naal rows 6–10. */
  appendedJamamSerials?: number[];
  /** Bracket labels for Naal rows 1–5. */
  antharaJamamSerials: number[];
  /** Yama order for next-morning day activities. */
  morningYamaOrder: number[];
  /** Yama order for night activities appended on rows 6–10. */
  nightYamaOrder: number[];
}

/**
 * Naal split for one Anthara cell.
 * Rows 1–5 stay on the clicked period. Rows 6–10 advance one thithi only when
 * the clicked cell is a night slice (day Anthara 6–10, or night Anthara 1–5).
 * Night Anthara 6–10 are already the next morning — their Naal 6–10 stay that
 * morning’s night jamams and do not step another thithi.
 * Day Anthara 1–5 keep same-day night jamams.
 */
export function resolveNaalAppendForAntharaClick(input: {
  parentJamamIndex: number;
  column: { jamamIndex?: number; appendedMorning?: boolean; segmentIndex: number };
  /** Next-thithi morning day slots can fill Naal rows 6–10. */
  canAppendNextMorning: boolean;
  /** Night slots of that same next morning (already-morning Anthara rows). */
  canAppendNextDayNight: boolean;
  /** Same-day night jamams can fill Naal rows 6–10 (day Anthara 1–5). */
  canAppendSameDayNight: boolean;
}): NaalAppendResolution {
  const { period: jamamPeriod } = yamaFromJamamIndex(input.parentJamamIndex);
  const isAppendedMorning = input.column.appendedMorning === true;
  const isAppendedNightJamam = input.column.jamamIndex != null && !isAppendedMorning;
  const rowJamamIndex = antharaColumnJamamIndex(input.column, input.parentJamamIndex);
  const { yama: rowYama } = yamaFromJamamIndex(rowJamamIndex);
  const period: PeriodId = isAppendedMorning
    ? "day"
    : isAppendedNightJamam
      ? "night"
      : jamamPeriod;
  const morningYamaOrder = yamasRotatedFrom(rowYama);
  const nightYamaOrder = yamasRotatedFrom(rowYama);

  const appendNextDayMorning =
    input.canAppendNextMorning &&
    ((jamamPeriod === "night" && !isAppendedMorning) || isAppendedNightJamam);
  const appendNextDayNight =
    !appendNextDayMorning && isAppendedMorning && input.canAppendNextDayNight;
  const appendNightJamam =
    !appendNextDayMorning &&
    !appendNextDayNight &&
    jamamPeriod === "day" &&
    !isAppendedMorning &&
    !isAppendedNightJamam &&
    input.canAppendSameDayNight;

  const appendedJamamSerials = appendNextDayMorning
    ? morningYamaOrder
    : appendNextDayNight || appendNightJamam
      ? nightJamamIndicesRotatedFromYama(rowYama)
      : undefined;

  return {
    period,
    appendNextDayMorning,
    appendNextDayNight,
    appendNightJamam,
    appendedJamamSerials,
    antharaJamamSerials: clickedPeriodJamamSerials(rowJamamIndex),
    morningYamaOrder,
    nightYamaOrder,
  };
}

function nightJamamSlotsRotatedFromYama(
  allJamamSlots: JamamSlot[],
  startYama: number,
): JamamSlot[] {
  const nightSlots = allJamamSlots
    .filter(
      (slot) =>
        slot.index >= NIGHT_JAMAM_SCHEDULE_START && slot.index <= NIGHT_JAMAM_SCHEDULE_END,
    )
    .sort((a, b) => a.index - b.index);
  const startIndex = nightSlots.findIndex(
    (slot) => yamaFromJamamIndex(slot.index).yama === startYama,
  );
  if (startIndex < 0) return nightSlots;
  return [...nightSlots.slice(startIndex), ...nightSlots.slice(0, startIndex)];
}

/** Day click: ten equal time parts within the jamam; rows 6–10 carry night jamam activities. */
function buildDayAntharaColumnsWithNightJamamRows(
  jamamStart: Date,
  jamamEnd: Date,
  allJamamSlots: JamamSlot[],
  startYama: number,
): PatchiAntharaColumn[] {
  const columns = getAntharaSegmentColumns(
    jamamStart,
    jamamEnd,
    JAMAM_ANTHARA_SEGMENT_COUNT,
  );
  const nightSlots = nightJamamSlotsRotatedFromYama(allJamamSlots, startYama);

  return columns.map((column, index) => {
    const nightSlot = nightSlots[index - ANTHARA_DAY_SEGMENT_COUNT];
    if (index >= ANTHARA_DAY_SEGMENT_COUNT && nightSlot) {
      return { ...column, jamamIndex: nightSlot.index };
    }
    return column;
  });
}

/** Night click: ten equal time parts; rows 6–10 carry next-day morning jamams, rotated from clicked yama. */
function buildNightAntharaColumnsWithNextDayMorningRows(
  jamamStart: Date,
  jamamEnd: Date,
  startYama: number,
): PatchiAntharaColumn[] {
  const columns = getAntharaSegmentColumns(
    jamamStart,
    jamamEnd,
    JAMAM_ANTHARA_SEGMENT_COUNT,
  );
  const morningYamas = yamasRotatedFrom(startYama);

  return columns.map((column, index) => {
    if (index >= ANTHARA_DAY_SEGMENT_COUNT) {
      const yama = morningYamas[index - ANTHARA_DAY_SEGMENT_COUNT] ?? 1;
      return { ...column, jamamIndex: yama, appendedMorning: true };
    }
    return column;
  });
}

/** Resolve anthara segment count for a jamam dialog open. */
export function antharaSegmentCountForJamam(
  jamamIndex: number,
  segmentCount?: number,
  appendNightJamamRows = false,
  appendNextDayMorningJamamRows = false,
): number {
  const { period } = yamaFromJamamIndex(jamamIndex);
  if (period === "night") {
    if (appendNextDayMorningJamamRows) {
      return JAMAM_ANTHARA_SEGMENT_COUNT;
    }
    // Night-only: five anthara parts — never a 10-row cycle that looks like jamam 6–10.
    return ANTHARA_NIGHT_SEGMENT_COUNT;
  }
  if (appendNightJamamRows) {
    return JAMAM_ANTHARA_SEGMENT_COUNT;
  }
  return segmentCount ?? JAMAM_ANTHARA_SEGMENT_COUNT;
}

/** Five patchi × anthara segments for one jamam window; day opens may append jamams 6–10. */
export function getPatchiAntharaMatrix(
  jamamStart: Date,
  jamamEnd: Date,
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[],
  jamamIndex: number,
  segmentCount?: number,
  options: PatchiAntharaMatrixOptions = {},
): PatchiAntharaMatrix {
  const { yama, period } = yamaFromJamamIndex(jamamIndex);
  const appendNightJamamRows =
    options.appendNightJamamRows === true &&
    period === "day" &&
    Boolean(options.allJamamSlots?.length);
  const appendNextDayMorningJamamRows =
    options.appendNextDayMorningJamamRows === true &&
    period === "night" &&
    Boolean(options.getMorningJamamActivitySlots);
  const antharaSegmentCount = antharaSegmentCountForJamam(
    jamamIndex,
    segmentCount,
    appendNightJamamRows,
    appendNextDayMorningJamamRows,
  );

  const slots = getActivitySlots(yama, period);

  let columns: PatchiAntharaColumn[];
  let antharaColumnCount: number;

  if (appendNightJamamRows && options.allJamamSlots) {
    columns = buildDayAntharaColumnsWithNightJamamRows(
      jamamStart,
      jamamEnd,
      options.allJamamSlots,
      yama,
    );
    antharaColumnCount = ANTHARA_DAY_SEGMENT_COUNT;
  } else if (appendNextDayMorningJamamRows) {
    columns = buildNightAntharaColumnsWithNextDayMorningRows(
      jamamStart,
      jamamEnd,
      yama,
    );
    antharaColumnCount = ANTHARA_DAY_SEGMENT_COUNT;
  } else {
    columns = getAntharaSegmentColumns(jamamStart, jamamEnd, antharaSegmentCount);
    antharaColumnCount = antharaSegmentCount;
  }
  const activityOrder = antharaThozhilCycleOrder(period);

  const rows: PatchiAntharaRow[] = PATCHI_ORDER.map((patchi) => {
    const match = slots.find((entry) => patchiBaseName(entry.bird) === patchi);
    const thozhil = match ? displayActivity(match.activity) : "—";
    const antharaActivities =
      thozhil === "—"
        ? Array<string>(antharaColumnCount).fill("—")
        : antharaActivitiesFrom(thozhil, antharaColumnCount, activityOrder);

    const appendedJamamActivities = columns.slice(antharaColumnCount).map((column) => {
      if (column.jamamIndex == null) return "—";
      if (appendNextDayMorningJamamRows && options.getMorningJamamActivitySlots) {
        return getMorningPatchiJamamActivity(
          options.getMorningJamamActivitySlots,
          column.jamamIndex,
          patchi,
        );
      }
      return getPatchiJamamActivity(getActivitySlots, column.jamamIndex, patchi);
    });

    return { patchi, activities: [...antharaActivities, ...appendedJamamActivities] };
  });

  return { columns, rows };
}

/** Segment index (0–9) containing `moment` within a jamam window. */
export function getAntharaSegmentIndex(
  jamamStart: Date,
  jamamEnd: Date,
  moment: Date,
  parts = JAMAM_ANTHARA_SEGMENT_COUNT,
): number {
  const starts = splitJamamStartTimes(jamamStart, jamamEnd, parts);
  const time = moment.getTime();
  for (let index = starts.length - 1; index >= 0; index -= 1) {
    if (time >= starts[index]!.getTime()) return index;
  }
  return 0;
}

/** Dialog title: Anthara Patchi · Jamam N · patchi · thozhil. */
export function antharaDialogTitle(
  jamamIndex: number,
  patchi: string,
  thozhil: string,
): Bilingual {
  const patchiBi = patchiLabelBilingual(patchi);
  const thozhilBi = activityBilingual(displayActivity(thozhil));
  return bi(
    `அந்தர பட்சி · ஜாமம் ${jamamIndex} · ${patchiBi.ta} · ${thozhilBi.ta}`,
    `Anthara Patchi · Jamam ${jamamIndex} · ${patchiBi.en} · ${thozhilBi.en}`,
  );
}

/** Start/end of one anthara segment column within a jamam window. */
export function antharaSegmentWindow(
  columns: PatchiAntharaColumn[],
  segmentIndex: number,
  jamamEnd: Date,
): { start: Date; end: Date } {
  const start = columns[segmentIndex]?.startTime ?? jamamEnd;
  const next = columns[segmentIndex + 1];
  const end = next ? next.startTime : jamamEnd;
  return { start, end };
}

/** Dialog title: Naal · Antharam N · patchi · activity (single bird). */
export function naalDialogTitle(
  antharaSerial: number,
  patchi: string,
  activity: string,
): Bilingual {
  const patchiBi = patchiLabelBilingual(patchi);
  const activityBi = activityBilingual(displayActivity(activity));
  return bi(
    `நாள் · அந்தரம் ${antharaSerial} · ${patchiBi.ta} · ${activityBi.ta}`,
    `Naal · Antharam ${antharaSerial} · ${patchiBi.en} · ${activityBi.en}`,
  );
}

/** Dialog title: Naal · Antharam N (all birds). */
export function naalAllBirdsDialogTitle(antharaSerial: number): Bilingual {
  return bi(`நாள் · அந்தரம் ${antharaSerial}`, `Naal · Antharam ${antharaSerial}`);
}
