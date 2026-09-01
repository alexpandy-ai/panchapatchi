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
  type JamamSlot,
  type PeriodId,
} from "./jamam";
import { formatPatchiName } from "./bilingual";
import { getPakshaFromDate, PAKSHA_LABELS, type PakshaId } from "./paksha";

export interface ActiveScheduleCell {
  groupKey: string;
  yama: number;
  period: PeriodId;
}

export interface ScheduleGridRow {
  yama: number;
  yamaLabel: string;
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

export interface PatchiScheduleDayRow {
  groupKey: string;
  groupLabel: string;
  dayCells: string[];
  nightCells: string[];
  isCurrentDay: boolean;
}

export interface JamamActivitySlots {
  day: ActivitySlot[];
  night: ActivitySlot[];
}

export function jamamActivitySlotsKey(groupKey: string, yama: number): string {
  return `${groupKey}:${yama}`;
}

export interface PatchiSchedule {
  patchiName: string;
  pakshaId: PakshaId;
  pakshaLabel: string;
  isActivePaksha: boolean;
  currentGroupKey: string;
  weekday: number;
  weekdayLabel: string;
  daySectionLabel: string;
  nightSectionLabel: string;
  jamamColumns: JamamColumn[];
  dayRows: PatchiScheduleDayRow[];
  jamamActivitySlots: Record<string, JamamActivitySlots>;
  activeCell: ActiveScheduleCell | null;
}

export interface PatchiSchedulesBundle {
  patchiName: string;
  weekday: number;
  weekdayLabel: string;
  currentGroupKey: string;
  activePakshaId: PakshaId;
  activePakshaLabel: string;
  schedules: PatchiSchedule[];
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

function buildGridRow(yama: YamaRow, daySlot: JamamSlot, nightSlot: JamamSlot): ScheduleGridRow {
  return {
    yama: yama.yama,
    yamaLabel: jamamLabel(yama.yama),
    dayTimeRange: formatTimeRange(daySlot.start, daySlot.end),
    nightTimeRange: formatTimeRange(nightSlot.start, nightSlot.end),
    dayBirds: yama.day.map((slot) => normalizeBird(slot.bird) || "—"),
    nightBirds: yama.night.map((slot) => normalizeBird(slot.bird) || "—"),
    dayJamamActive: daySlot.isActive,
    nightJamamActive: nightSlot.isActive,
  };
}

function activityForPatchi(
  yama: YamaRow,
  period: "day" | "night",
  patchiName: string,
): string {
  const slots = period === "day" ? yama.day : yama.night;
  const match = slots.find((slot) => normalizeBird(slot.bird) === normalizeBird(patchiName));
  return match ? displayActivity(match.activity) : "—";
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

function getDayGroupContext(selectedDateTime: Date, data: Record<PakshaId, PakshaData | null>) {
  const pakshaId = getPakshaFromDate(selectedDateTime);
  const paksha = data[pakshaId];
  if (!paksha) return null;

  const weekday = selectedDateTime.getDay();
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
  const context = getDayGroupContext(selectedDateTime, data);
  if (!context) return null;

  const { paksha, weekday, groupKey, group } = context;
  const { day, night } = getFullDayJamamSchedule(selectedDateTime, coords);

  const rows = group.yamas.flatMap((yama) => {
    const slots = jamamSlotsForYama(yama.yama, day, night);
    return slots ? [buildGridRow(yama, slots.day, slots.night)] : [];
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

function buildPatchiScheduleForPaksha(
  pakshaId: PakshaId,
  paksha: PakshaData,
  patchiName: string,
  selectedDateTime: Date,
  currentGroupKey: string,
  weekday: number,
  activeCell: ActiveScheduleCell | null,
  isActivePaksha: boolean,
  coords: GeoCoords | null,
): PatchiSchedule {
  const { day, night } = getFullDayJamamSchedule(selectedDateTime, coords);
  const refGroup = paksha.groups[0];
  const jamamColumns: JamamColumn[] = (refGroup?.yamas ?? []).flatMap((yama) => {
    const slots = jamamSlotsForYama(yama.yama, day, night);
    if (!slots) return [];

    return [
      {
        yama: yama.yama,
        yamaLabel: jamamLabel(jamamIndexForYama(yama.yama, "day")),
        dayTimeRange: formatTimeRange(slots.day.start, slots.day.end),
        nightTimeRange: formatTimeRange(slots.night.start, slots.night.end),
        dayStart: slots.day.start,
        dayEnd: slots.day.end,
        nightStart: slots.night.start,
        nightEnd: slots.night.end,
        dayJamamActive: isActivePaksha && slots.day.isActive,
        nightJamamActive: isActivePaksha && slots.night.isActive,
      },
    ];
  });

  const dayRows: PatchiScheduleDayRow[] = paksha.groups.map((group) => ({
    groupKey: group.key,
    groupLabel: getDayGroupLabel(group.key),
    dayCells: group.yamas.map((yama) => activityForPatchi(yama, "day", patchiName)),
    nightCells: group.yamas.map((yama) => activityForPatchi(yama, "night", patchiName)),
    isCurrentDay: group.key === currentGroupKey,
  }));

  const jamamActivitySlots: Record<string, JamamActivitySlots> = {};
  for (const group of paksha.groups) {
    for (const yama of group.yamas) {
      jamamActivitySlots[jamamActivitySlotsKey(group.key, yama.yama)] = {
        day: yama.day,
        night: yama.night,
      };
    }
  }

  return {
    patchiName,
    pakshaId,
    pakshaLabel: PAKSHA_LABELS[pakshaId],
    isActivePaksha,
    currentGroupKey,
    weekday,
    weekdayLabel: getDisplayWeekdayLabel(weekday),
    daySectionLabel: paksha.daySectionLabel,
    nightSectionLabel: paksha.nightSectionLabel,
    jamamColumns,
    dayRows,
    jamamActivitySlots,
    activeCell: isActivePaksha ? activeCell : null,
  };
}

export function getPatchiSchedulesForDate(
  selectedDateTime: Date,
  data: Record<PakshaId, PakshaData | null>,
  patchiName: string,
  coords: GeoCoords | null = null,
): PatchiSchedulesBundle | null {
  const weekday = selectedDateTime.getDay();
  const currentGroupKey = getDayGroupKey(weekday);
  const activePakshaId = getPakshaFromDate(selectedDateTime);
  const jamam = getJamamState(selectedDateTime, coords);
  const activeSlot = jamam.slots.find((slot) => slot.isActive);

  const activeCell: ActiveScheduleCell | null = activeSlot
    ? {
        groupKey: currentGroupKey,
        yama: jamam.yamaIndex,
        period: jamam.period,
      }
    : null;

  const schedules: PatchiSchedule[] = [];
  for (const pakshaId of ["valarpirai", "theipirai"] as PakshaId[]) {
    const paksha = data[pakshaId];
    if (!paksha) continue;

    schedules.push(
      buildPatchiScheduleForPaksha(
        pakshaId,
        paksha,
        patchiName,
        selectedDateTime,
        currentGroupKey,
        weekday,
        activeCell,
        pakshaId === activePakshaId,
        coords,
      ),
    );
  }

  if (schedules.length === 0) return null;

  return {
    patchiName,
    weekday,
    weekdayLabel: getDisplayWeekdayLabel(weekday),
    currentGroupKey,
    activePakshaId,
    activePakshaLabel: PAKSHA_LABELS[activePakshaId],
    schedules,
  };
}

export function getPatchiScheduleForDate(
  selectedDateTime: Date,
  data: Record<PakshaId, PakshaData | null>,
  patchiName: string,
  coords: GeoCoords | null = null,
): PatchiSchedule | null {
  const bundle = getPatchiSchedulesForDate(selectedDateTime, data, patchiName, coords);
  if (!bundle) return null;

  return (
    bundle.schedules.find((schedule) => schedule.pakshaId === bundle.activePakshaId) ??
    bundle.schedules[0] ??
    null
  );
}

/** @deprecated Use getPatchiScheduleForDate for compact per-patchi table */
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

export function isActiveJamamColumn(
  activeCell: ActiveScheduleCell | null,
  yama: number,
  period: PeriodId,
): boolean {
  if (!activeCell) return false;
  return activeCell.yama === yama && activeCell.period === period;
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
