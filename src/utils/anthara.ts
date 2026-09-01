import type { ActivitySlot } from "../types";
import { displayActivity } from "./activityLabel";
import { PANCHA_ACTIVITY_TA, PATCHI_ORDER, patchiBaseName } from "./bilingual";
import type { PeriodId } from "./jamam";
import { splitJamamStartTimes } from "./jamam";

export const JAMAM_ANTHARA_SEGMENT_COUNT = 10;

/** Birds cycle in Pancha display order (same as Others / Know Patchi). */
const ANTHARA_BIRD_ORDER = PATCHI_ORDER;

/** Activities cycle in Pancha display order (same as Others / Know Patchi). */
const ANTHARA_ACTIVITY_ORDER = PANCHA_ACTIVITY_TA;

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
export function antharaActivitiesFrom(startActivity: string, count = JAMAM_ANTHARA_SEGMENT_COUNT): string[] {
  const activity = displayActivity(startActivity);
  return cycleFrom(ANTHARA_ACTIVITY_ORDER, activity as (typeof ANTHARA_ACTIVITY_ORDER)[number], count);
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
): string[] {
  const activities = antharaActivitiesFrom(startActivity, count);
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
  const activities = rotateFrom(
    ANTHARA_ACTIVITY_ORDER,
    mainActivity as (typeof ANTHARA_ACTIVITY_ORDER)[number],
  );
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
): AntharaSlot[] {
  const segmentStarts = splitJamamStartTimes(jamamStart, jamamEnd);
  const segmentCount = segmentStarts.length;
  const hasActivity = thozhilActivity !== "—" && thozhilActivity !== "";

  const activities = hasActivity
    ? antharaActivitiesFrom(thozhilActivity, segmentCount)
    : Array<string>(segmentCount).fill("—");
  const birds = hasActivity
    ? antharaBirdsFromJamam(dayJamamSlots, nightJamamSlots, thozhilActivity, segmentCount)
    : Array<string>(segmentCount).fill("—");

  return segmentStarts.map((start, index) => ({
    index: index + 1,
    bird: birds[index],
    activity: activities[index],
    start,
    end: index < segmentCount - 1 ? segmentStarts[index + 1] : jamamEnd,
  }));
}
