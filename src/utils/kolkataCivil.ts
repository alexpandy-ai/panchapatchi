/** Asia/Kolkata is a fixed offset of UTC+5:30 (no daylight saving). */
export const KOLKATA_OFFSET_MINUTES = 5 * 60 + 30;

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface CivilDateTime extends CivilDate {
  hour: number;
  minute: number;
}

export interface UtcQuarterEvent {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  phase: string;
}

export interface KolkataQuarterEvent {
  phase: string;
  hour: number;
  minute: number;
}

/**
 * Convert a UTC civil time to the Asia/Kolkata civil time.
 * IST is ahead of UTC, so times at or after 18:30 UTC fall on the next Kolkata date.
 */
export function utcCivilToKolkata(utc: CivilDateTime): CivilDateTime {
  const utcMs = Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0);
  const kolkataMs = utcMs + KOLKATA_OFFSET_MINUTES * 60_000;
  const shifted = new Date(kolkataMs);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function kolkataDateKey(date: CivilDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

/** Gregorian weekday for a calendar date: 0 = Sunday … 6 = Saturday. */
export function gregorianWeekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Days in a Gregorian month. February is 29 only in leap years. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDates(year: number, month: number): CivilDate[] {
  const count = daysInMonth(year, month);
  const dates: CivilDate[] = [];
  for (let day = 1; day <= count; day += 1) {
    dates.push({ year, month, day });
  }
  return dates;
}

/** Current calendar date in Asia/Kolkata, independent of the browser time zone. */
export function kolkataToday(now: Date = new Date()): CivilDate & { weekday: number } {
  const shifted = new Date(now.getTime() + KOLKATA_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return { year, month, day, weekday: gregorianWeekday(year, month, day) };
}

/**
 * Place each UTC quarter-phase instant on its Asia/Kolkata calendar date.
 * A late-UTC event can belong to the next Kolkata month.
 */
export function kolkataQuarterEventsInMonth(
  events: readonly UtcQuarterEvent[],
  year: number,
  month: number,
): Map<string, KolkataQuarterEvent[]> {
  const grouped = new Map<string, KolkataQuarterEvent[]>();
  for (const event of events) {
    const kolkata = utcCivilToKolkata(event);
    if (kolkata.year !== year || kolkata.month !== month) continue;
    const key = kolkataDateKey(kolkata);
    const list = grouped.get(key) ?? [];
    list.push({ phase: event.phase, hour: kolkata.hour, minute: kolkata.minute });
    grouped.set(key, list);
  }
  return grouped;
}
