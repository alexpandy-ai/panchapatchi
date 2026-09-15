import type { GeoCoords } from "./location";
import {
  formatTimeRange,
  getFullDayJamamSchedule,
  jamamIndexForYama,
  jamamLabel,
  JAMAM_COUNT,
  type JamamSlot,
} from "./jamam";

export interface DaySchedulerJamamColumn {
  yama: number;
  dayTimeRange: string;
  nightTimeRange: string;
  dayStart: Date;
  dayEnd: Date;
  nightStart: Date;
  nightEnd: Date;
  dayJamamActive: boolean;
  nightJamamActive: boolean;
}

/** Sunrise-based jamam columns for Day Scheduler (independent of PATCHI_SCHEDULE_DATA). */
export function buildDaySchedulerJamamColumns(
  date: Date,
  coords: GeoCoords | null,
): DaySchedulerJamamColumn[] {
  const { day, night } = getFullDayJamamSchedule(date, coords);

  return Array.from({ length: JAMAM_COUNT }, (_, i) => {
    const yama = i + 1;
    const daySlot = day.find((slot) => slot.index === jamamIndexForYama(yama, "day"));
    const nightSlot = night.find((slot) => slot.index === jamamIndexForYama(yama, "night"));
    if (!daySlot || !nightSlot) {
      throw new Error(`Missing jamam slots for yama ${yama}`);
    }

    return {
      yama,
      dayTimeRange: formatTimeRange(daySlot.start, daySlot.end),
      nightTimeRange: formatTimeRange(nightSlot.start, nightSlot.end),
      dayStart: daySlot.start,
      dayEnd: daySlot.end,
      nightStart: nightSlot.start,
      nightEnd: nightSlot.end,
      dayJamamActive: daySlot.isActive,
      nightJamamActive: nightSlot.isActive,
    };
  });
}

/** Build continuous jamam slots (1–10) from Day Scheduler columns. */
export function daySchedulerJamamSlots(columns: DaySchedulerJamamColumn[]): JamamSlot[] {
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
