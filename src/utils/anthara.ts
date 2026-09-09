import type { ActivitySlot } from "../types";
import { displayActivity } from "./activityLabel";
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
import { formatTimeWithSeconds, splitJamamStartTimes, yamaFromJamamIndex } from "./jamam";

export const JAMAM_ANTHARA_SEGMENT_COUNT = 10;

/** Anthara sub-segments within one day jamam when night jamam rows are appended. */
export const ANTHARA_DAY_SEGMENT_COUNT = 5;

/** Anthara sub-segments within one night jamam. */
export const ANTHARA_NIGHT_SEGMENT_COUNT = 5;

export const NIGHT_JAMAM_SCHEDULE_START = 6;
export const NIGHT_JAMAM_SCHEDULE_END = 10;

/** Birds cycle in Pancha display order (same as Others / Know Patchi). */
const ANTHARA_BIRD_ORDER = PATCHI_ORDER;

/** Day: Pancha order; night: jamam sheet order — used for all anthara patchi views. */
function antharaThozhilCycleOrder(period: PeriodId): readonly string[] {
  return period === "day" ? PANCHA_ACTIVITY_TA : JAMAM_ACTIVITY_TA;
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
  /** Appended night jamam rows (6–10) — shown in the Antharam column. */
  jamamIndex?: number;
}

export interface PatchiAntharaMatrixOptions {
  /** Append jamams 6–10 with schedule activities after day anthara rows. */
  appendNightJamamRows?: boolean;
  /** All jamam slots (1–10) — required when appendNightJamamRows is true. */
  allJamamSlots?: JamamSlot[];
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

/** Day click: ten equal time parts within the jamam; rows 6–10 carry night jamam activities. */
function buildDayAntharaColumnsWithNightJamamRows(
  jamamStart: Date,
  jamamEnd: Date,
  allJamamSlots: JamamSlot[],
): PatchiAntharaColumn[] {
  const columns = getAntharaSegmentColumns(
    jamamStart,
    jamamEnd,
    JAMAM_ANTHARA_SEGMENT_COUNT,
  );
  const nightSlots = allJamamSlots
    .filter(
      (slot) =>
        slot.index >= NIGHT_JAMAM_SCHEDULE_START && slot.index <= NIGHT_JAMAM_SCHEDULE_END,
    )
    .sort((a, b) => a.index - b.index);

  return columns.map((column, index) => {
    const nightSlot = nightSlots[index - ANTHARA_DAY_SEGMENT_COUNT];
    if (index >= ANTHARA_DAY_SEGMENT_COUNT && nightSlot) {
      return { ...column, jamamIndex: nightSlot.index };
    }
    return column;
  });
}

/** Resolve anthara segment count for a jamam dialog open. */
export function antharaSegmentCountForJamam(
  jamamIndex: number,
  segmentCount?: number,
  appendNightJamamRows = false,
): number {
  const { period } = yamaFromJamamIndex(jamamIndex);
  if (period === "night") {
    return segmentCount ?? ANTHARA_NIGHT_SEGMENT_COUNT;
  }
  if (appendNightJamamRows) {
    return segmentCount ?? ANTHARA_DAY_SEGMENT_COUNT;
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
  const { period } = yamaFromJamamIndex(jamamIndex);
  const appendNightJamamRows =
    options.appendNightJamamRows === true &&
    period === "day" &&
    Boolean(options.allJamamSlots?.length);
  const antharaSegmentCount = antharaSegmentCountForJamam(
    jamamIndex,
    segmentCount,
    appendNightJamamRows,
  );

  let columns: PatchiAntharaColumn[];
  let antharaColumnCount: number;

  if (appendNightJamamRows && options.allJamamSlots) {
    columns = buildDayAntharaColumnsWithNightJamamRows(
      jamamStart,
      jamamEnd,
      options.allJamamSlots,
    );
    antharaColumnCount = ANTHARA_DAY_SEGMENT_COUNT;
  } else {
    columns = getAntharaSegmentColumns(jamamStart, jamamEnd, antharaSegmentCount);
    antharaColumnCount = antharaSegmentCount;
  }

  const { yama } = yamaFromJamamIndex(jamamIndex);
  const slots = getActivitySlots(yama, period);
  const activityOrder = antharaThozhilCycleOrder(period);

  const rows: PatchiAntharaRow[] = PATCHI_ORDER.map((patchi) => {
    const match = slots.find((entry) => patchiBaseName(entry.bird) === patchi);
    const thozhil = match ? displayActivity(match.activity) : "—";
    const antharaActivities =
      thozhil === "—"
        ? Array<string>(antharaColumnCount).fill("—")
        : antharaActivitiesFrom(thozhil, antharaColumnCount, activityOrder);

    const nightJamamActivities = columns
      .slice(antharaColumnCount)
      .map((column) =>
        column.jamamIndex != null
          ? getPatchiJamamActivity(getActivitySlots, column.jamamIndex, patchi)
          : "—",
      );

    return { patchi, activities: [...antharaActivities, ...nightJamamActivities] };
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
