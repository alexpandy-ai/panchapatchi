import type { GeoCoords } from "./location";
import { getNextSunrise, getSunrise } from "./sunrise";

export const JAMAM_COUNT = 5;

export const FULL_JAMAM_COUNT = 10;

/** Night jamams continue day numbering: yama 1 → jamam 6, etc. */
export const NIGHT_JAMAM_OFFSET = 5;

export type PeriodId = "day" | "night";

/** Excel yama (1–5) + period → continuous jamam index (1–10). */
export function jamamIndexForYama(yama: number, period: PeriodId): number {
  return period === "day" ? yama : yama + NIGHT_JAMAM_OFFSET;
}

/** Continuous jamam index (1–10) → Excel yama (1–5) and period. */
export function yamaFromJamamIndex(jamamIndex: number): { yama: number; period: PeriodId } {
  if (jamamIndex <= JAMAM_COUNT) {
    return { yama: jamamIndex, period: "day" };
  }
  return { yama: jamamIndex - NIGHT_JAMAM_OFFSET, period: "night" };
}

export function jamamLabel(index: number): string {
  return `ஜாமம் ${index}`;
}

export interface JamamSlot {
  index: number;
  label: string;
  period: PeriodId;
  start: Date;
  end: Date;
  isActive: boolean;
}

export interface JamamState {
  period: PeriodId;
  periodLabel: string;
  /** Continuous jamam number 1–10 across the full day cycle. */
  jamamIndex: number;
  /** Excel yama 1–5 for the active period. */
  yamaIndex: number;
  jamamLabel: string;
  slots: JamamSlot[];
  nextJamamEnd: Date | null;
}

/** Start of the sunrise-to-sunrise cycle that contains `moment`. */
export function cycleStartFor(moment: Date, coords: GeoCoords | null): Date {
  const todaySunrise = getSunrise(moment, coords);
  if (moment < todaySunrise) {
    const prev = new Date(todaySunrise);
    prev.setDate(prev.getDate() - 1);
    return getSunrise(prev, coords);
  }
  return todaySunrise;
}

/** Selected calendar date's sunrise → next day's sunrise. */
export function getDayCycleBounds(
  date: Date,
  coords: GeoCoords | null,
): { sunrise: Date; nextSunrise: Date } {
  const sunrise = getSunrise(date, coords);
  return { sunrise, nextSunrise: getNextSunrise(sunrise, coords) };
}

function buildFullDaySlots(cycleStart: Date, now: Date, coords: GeoCoords | null): JamamSlot[] {
  const cycleEnd = getNextSunrise(cycleStart, coords);
  const durationMs = (cycleEnd.getTime() - cycleStart.getTime()) / FULL_JAMAM_COUNT;

  return Array.from({ length: FULL_JAMAM_COUNT }, (_, i) => {
    const jamamIndex = i + 1;
    const { period } = yamaFromJamamIndex(jamamIndex);
    const slotStart = new Date(cycleStart.getTime() + durationMs * i);
    const slotEnd = new Date(cycleStart.getTime() + durationMs * (i + 1));
    return {
      index: jamamIndex,
      label: jamamLabel(jamamIndex),
      period,
      start: slotStart,
      end: slotEnd,
      isActive: now >= slotStart && now < slotEnd,
    };
  });
}

/** 10 equal jamams from selected date's sunrise to next sunrise. */
export function getFullDayJamamSchedule(
  date: Date,
  coords: GeoCoords | null,
): {
  day: JamamSlot[];
  night: JamamSlot[];
  all: JamamSlot[];
} {
  const { sunrise } = getDayCycleBounds(date, coords);
  const all = buildFullDaySlots(sunrise, date, coords);
  return {
    all,
    day: all.filter((slot) => slot.period === "day"),
    night: all.filter((slot) => slot.period === "night"),
  };
}

export function getJamamState(now: Date, coords: GeoCoords | null): JamamState {
  const cycleStart = cycleStartFor(now, coords);
  const slots = buildFullDaySlots(cycleStart, now, coords);
  const active = slots.find((slot) => slot.isActive) ?? slots[0];
  const { yama, period } = yamaFromJamamIndex(active.index);
  const periodLabel = period === "day" ? "பகல்" : "இரவு";

  return {
    period,
    periodLabel,
    jamamIndex: active.index,
    yamaIndex: yama,
    jamamLabel: active.label,
    slots,
    nextJamamEnd: active.end,
  };
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("ta-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatCountdown(target: Date, now: Date): string {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatJamamDuration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} நிமிடம்`;
  if (m === 0) return `${h} மணி`;
  return `${h} மணி ${m} நிமிடம்`;
}
