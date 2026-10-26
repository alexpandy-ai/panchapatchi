import type { ActivitySlot, DayGroup, PakshaData, YamaRow } from "../types";
import { displayActivity } from "./activityLabel";
import { getDayGroupKey, getDayGroupLabel, getDisplayWeekdayLabel } from "./dayGroup";
import type { GeoCoords } from "./location";
import {
  formatTimeRange,
  getFullDayJamamSchedule,
  getJamamState,
  jamamIndexForYama,
  jamamLabel,
  NIGHT_JAMAM_OFFSET,
  yamaFromJamamIndex,
  type JamamSlot,
  type PeriodId,
} from "./jamam";
import { formatPatchiName, PATCHI_ORDER, patchiBaseName } from "./bilingual";
import { getPakshaFromDate, PAKSHA_LABELS, type PakshaId } from "./paksha";
import { placeWeekday } from "./placeClock";

export interface ActiveScheduleCell {
  groupKey: string;
  yama: number;
  period: PeriodId;
}

export interface ScheduleGridRow {
  yama: number;
  /** @deprecated Use dayJamamLabel / nightJamamLabel */
  yamaLabel: string;
  dayJamamLabel: string;
  nightJamamLabel: string;
  dayTimeRange: string;
  nightTimeRange: string;
  dayBirds: string[];
  nightBirds: string[];
  dayJamamActive: boolean;
  nightJamamActive: boolean;
}

export interface ScheduleGrid {
  pakshaLabel: string;
  groupKey: string;
  groupLabel: string;
  weekdayLabel: string;
  daySectionLabel: string;
  nightSectionLabel: string;
  dayActivities: string[];
  nightActivities: string[];
  rows: ScheduleGridRow[];
  activeCell: ActiveScheduleCell | null;
}

export interface JamamColumn {
  yama: number;
  yamaLabel: string;
  dayTimeRange: string;
  nightTimeRange: string;
  dayStart: Date;
  dayEnd: Date;
  nightStart: Date;
  nightEnd: Date;
  dayJamamActive: boolean;
  nightJamamActive: boolean;
}

function normalizeBird(bird: string): string {
  return formatPatchiName(bird);
}

function isSameBird(a: string, b: string): boolean {
  return normalizeBird(a) === normalizeBird(b);
}

/** Eating bird for a schedule group (Patchi row label in Know Patchi table). */
export function getEatingBirdForGroup(group: DayGroup): string | null {
  const eatingSlot =
    group.yamas[0]?.day.find((slot) => displayActivity(slot.activity) === "ஊண்") ??
    group.yamas[0]?.day[0];
  return eatingSlot?.bird ?? null;
}

/** Find the schedule group whose Patchi row label matches the given bird. */
export function findGroupByEatingBird(
  paksha: PakshaData,
  athikaraPatchi: string,
): DayGroup | null {
  return (
    paksha.groups.find((group) => {
      const eatingBird = getEatingBirdForGroup(group);
      return eatingBird && isSameBird(eatingBird, athikaraPatchi);
    }) ?? null
  );
}

export function getJamamSlotsForGroup(
  group: DayGroup,
  yamaIndex: number,
  period: PeriodId,
): ActivitySlot[] {
  const yamaRow = group.yamas.find((y) => y.yama === yamaIndex);
  if (!yamaRow) return [];
  return period === "day" ? yamaRow.day : yamaRow.night;
}

export interface DerivedPatchiStatus {
  athikaraGroupKey: string | null;
  myPatchi: string | null;
  myPatchiActivity: string | null;
  jamamSlots: ActivitySlot[];
}

/**
 * Know Patchi table semantics:
 * 1. Athikara Patchi selects the schedule row (eating bird on that row).
 * 2. My Patchi selects which bird's jamam-column cell to read for Thozhil.
 */
export function derivePatchiStatusFromSchedule(
  paksha: PakshaData,
  _weekday: number,
  athikaraPatchi: string,
  yamaIndex: number,
  period: PeriodId,
  myPatchi: string | null = null,
): DerivedPatchiStatus {
  const athikaraGroup = findGroupByEatingBird(paksha, athikaraPatchi);

  if (!athikaraGroup) {
    return {
      athikaraGroupKey: null,
      myPatchi: null,
      myPatchiActivity: null,
      jamamSlots: [],
    };
  }

  const jamamSlots = getJamamSlotsForGroup(athikaraGroup, yamaIndex, period);
  const mySlot =
    myPatchi != null
      ? jamamSlots.find((slot) => isSameBird(slot.bird, myPatchi))
      : null;

  return {
    athikaraGroupKey: athikaraGroup.key,
    myPatchi: mySlot ? normalizeBird(mySlot.bird) : null,
    myPatchiActivity: mySlot?.activity ?? null,
    jamamSlots,
  };
}

export function extractPatchiNames(...sheets: (PakshaData | null)[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const sheet of sheets) {
    if (!sheet) continue;
    for (const group of sheet.groups) {
      for (const yama of group.yamas) {
        for (const slot of [...yama.day, ...yama.night]) {
          const bird = normalizeBird(slot.bird);
          if (!bird || seen.has(bird)) continue;
          seen.add(bird);
          names.push(bird);
        }
      }
    }
  }

  return names;
}

export function getPatchiSlotAtJamam(
  paksha: PakshaData,
  groupKey: string,
  yamaIndex: number,
  period: PeriodId,
  patchiName: string,
): ActivitySlot | null {
  const group = paksha.groups.find((g) => g.key === groupKey);
  const yamaRow = group?.yamas.find((y) => y.yama === yamaIndex);
  if (!yamaRow) return null;

  const slots = period === "day" ? yamaRow.day : yamaRow.night;
  return slots.find((slot) => normalizeBird(slot.bird) === normalizeBird(patchiName)) ?? null;
}

function jamamSlotsForYama(
  yamaNumber: number,
  daySlots: JamamSlot[],
  nightSlots: JamamSlot[],
): { day: JamamSlot; night: JamamSlot } | null {
  const day = daySlots.find((slot) => slot.index === yamaNumber);
  const night = nightSlots.find((slot) => slot.index === yamaNumber + NIGHT_JAMAM_OFFSET);
  if (!day || !night) return null;
  return { day, night };
}

function buildGridRow(
  yama: YamaRow,
  daySlot: JamamSlot,
  nightSlot: JamamSlot,
  coords: GeoCoords | null,
): ScheduleGridRow {
  return {
    yama: yama.yama,
    yamaLabel: jamamLabel(daySlot.index),
    dayJamamLabel: jamamLabel(daySlot.index),
    nightJamamLabel: jamamLabel(nightSlot.index),
    dayTimeRange: formatTimeRange(daySlot.start, daySlot.end, coords),
    nightTimeRange: formatTimeRange(nightSlot.start, nightSlot.end, coords),
    dayBirds: yama.day.map((slot) => normalizeBird(slot.bird) || "—"),
    nightBirds: yama.night.map((slot) => normalizeBird(slot.bird) || "—"),
    dayJamamActive: daySlot.isActive,
    nightJamamActive: nightSlot.isActive,
  };
}

function resolveActiveCell(
  selectedDateTime: Date,
  currentGroupKey: string,
  coords: GeoCoords | null,
): ActiveScheduleCell | null {
  const jamam = getJamamState(selectedDateTime, coords);
  const activeSlot = jamam.slots.find((slot) => slot.isActive);
  if (!activeSlot) return null;

  return {
    groupKey: currentGroupKey,
    yama: jamam.yamaIndex,
    period: jamam.period,
  };
}

function getDayGroupContext(
  selectedDateTime: Date,
  data: Record<PakshaId, PakshaData | null>,
  coords: GeoCoords | null,
) {
  const pakshaId = getPakshaFromDate(selectedDateTime);
  const paksha = data[pakshaId];
  if (!paksha) return null;

  const weekday = placeWeekday(selectedDateTime, coords);
  const groupKey = getDayGroupKey(weekday);
  const group = paksha.groups.find((g) => g.key === groupKey);
  if (!group) return null;

  return { pakshaId, paksha, weekday, groupKey, group };
}

export function getScheduleGridForDate(
  selectedDateTime: Date,
  data: Record<PakshaId, PakshaData | null>,
  coords: GeoCoords | null = null,
): ScheduleGrid | null {
  const context = getDayGroupContext(selectedDateTime, data, coords);
  if (!context) return null;

  const { paksha, weekday, groupKey, group } = context;
  const { day, night } = getFullDayJamamSchedule(selectedDateTime, coords);

  const rows = group.yamas.flatMap((yama) => {
    const slots = jamamSlotsForYama(yama.yama, day, night);
    return slots ? [buildGridRow(yama, slots.day, slots.night, coords)] : [];
  });

  return {
    pakshaLabel: PAKSHA_LABELS[context.pakshaId],
    groupKey,
    groupLabel: getDayGroupLabel(groupKey),
    weekdayLabel: getDisplayWeekdayLabel(weekday),
    daySectionLabel: paksha.daySectionLabel,
    nightSectionLabel: paksha.nightSectionLabel,
    dayActivities: paksha.dayActivities.map(displayActivity),
    nightActivities: paksha.nightActivities.map(displayActivity),
    rows,
    activeCell: resolveActiveCell(selectedDateTime, groupKey, coords),
  };
}

/** @deprecated */
export function getPatchiGridForDate(
  selectedDateTime: Date,
  data: Record<PakshaId, PakshaData | null>,
  patchiName: string,
  coords: GeoCoords | null = null,
): (ScheduleGrid & { patchiName: string }) | null {
  const grid = getScheduleGridForDate(selectedDateTime, data, coords);
  if (!grid) return null;
  return { ...grid, patchiName };
}

export function getJamamSummary(selectedDateTime: Date, coords: GeoCoords | null = null) {
  const jamam = getJamamState(selectedDateTime, coords);
  const activeSlot = jamam.slots.find((slot) => slot.isActive);
  return { jamam, activeSlot };
}

export function isActivePeriodCell(
  activeCell: ActiveScheduleCell | null,
  groupKey: string,
  yama: number,
  period: PeriodId,
): boolean {
  if (!activeCell) return false;
  return activeCell.groupKey === groupKey && activeCell.yama === yama && activeCell.period === period;
}

export function isActiveJamamRow(
  activeCell: ActiveScheduleCell | null,
  groupKey: string,
  yama: number,
): boolean {
  if (!activeCell) return false;
  return activeCell.groupKey === groupKey && activeCell.yama === yama;
}

export interface PatchiThozhilColumn {
  jamamIndex: number;
  timeRange: string;
  period: PeriodId;
}

export interface PatchiThozhilRow {
  patchi: (typeof PATCHI_ORDER)[number];
  activities: string[];
}

export interface PatchiThozhilMatrix {
  columns: PatchiThozhilColumn[];
  rows: PatchiThozhilRow[];
}

/** All 5 patchi × 10 jamam thozhil matrix for the athikara schedule group. */
export function getPatchiThozhilMatrix(
  jamamSlots: JamamSlot[],
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[],
  coords: GeoCoords | null,
): PatchiThozhilMatrix {
  const columns: PatchiThozhilColumn[] = jamamSlots.map((slot) => ({
    jamamIndex: slot.index,
    timeRange: formatTimeRange(slot.start, slot.end, coords),
    period: slot.period,
  }));

  const rows: PatchiThozhilRow[] = PATCHI_ORDER.map((patchi) => ({
    patchi,
    activities: jamamSlots.map((slot) => {
      const { yama, period } = yamaFromJamamIndex(slot.index);
      const slots = getActivitySlots(yama, period);
      const match = slots.find((entry) => patchiBaseName(entry.bird) === patchi);
      return match ? displayActivity(match.activity) : "—";
    }),
  }));

  return { columns, rows };
}

/** Build continuous jamam slots (1–10) from schedule column times. */
export function jamamSlotsFromColumns(columns: JamamColumn[]): JamamSlot[] {
  return columns
    .flatMap((column) => [
      {
        index: jamamIndexForYama(column.yama, "day"),
        label: jamamLabel(jamamIndexForYama(column.yama, "day")),
        period: "day" as const,
        start: column.dayStart,
        end: column.dayEnd,
        isActive: column.dayJamamActive,
      },
      {
        index: jamamIndexForYama(column.yama, "night"),
        label: jamamLabel(jamamIndexForYama(column.yama, "night")),
        period: "night" as const,
        start: column.nightStart,
        end: column.nightEnd,
        isActive: column.nightJamamActive,
      },
    ])
    .sort((a, b) => a.index - b.index);
}
