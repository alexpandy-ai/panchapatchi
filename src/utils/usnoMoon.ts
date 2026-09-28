import {
  daysInMonth,
  gregorianWeekday,
  kolkataDateKey,
  kolkataQuarterEventsInMonth,
  monthDates,
  type KolkataQuarterEvent,
  type UtcQuarterEvent,
} from "./kolkataCivil";
import { resolvePlaceZone, usnoTzForCivilDate, type PlaceZone } from "./placeTimeZone";

const USNO_ORIGIN = "https://aa.usno.navy.mil";
const DAY_CONCURRENCY = 6;

export interface MoonDayRow {
  year: number;
  month: number;
  day: number;
  weekday: number;
  /** USNO `curphase` at local noon. Moon-phase wording, not a tithi. */
  phase: string;
  /** Illuminated fraction from USNO `fracillum`, shown as a percent. */
  illumination: string;
  quarters: KolkataQuarterEvent[];
}

export interface MoonMonthResult {
  cacheKey: string;
  year: number;
  month: number;
  timeZoneLabel: string;
  rows: MoonDayRow[];
}

interface UsnoOneDayBody {
  error?: unknown;
  properties?: {
    data?: {
      curphase?: unknown;
      fracillum?: unknown;
    };
  };
}

interface UsnoYearBody {
  error?: unknown;
  phasedata?: unknown;
}

const monthCache = new Map<string, MoonMonthResult>();
const monthInflight = new Map<string, Promise<MoonMonthResult>>();
const yearCache = new Map<number, UtcQuarterEvent[]>();
const yearInflight = new Map<number, Promise<UtcQuarterEvent[]>>();

export function roundCoord(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function moonMonthCacheKey(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  timeZoneToken: string,
): string {
  return `${year}-${month}-${roundCoord(latitude)}-${roundCoord(longitude)}-${timeZoneToken}`;
}

export function peekMoonMonth(cacheKey: string): MoonMonthResult | undefined {
  return monthCache.get(cacheKey);
}

/** Illumination label from USNO `fracillum` (live responses use strings like "97%"). */
export function parseFracillum(value: string): string {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) return trimmed;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return trimmed;
  if (numeric >= 0 && numeric <= 1) return `${Math.round(numeric * 100)}%`;
  return `${Math.round(numeric)}%`;
}

export function parseUsnoClock(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    throw new Error(`USNO phase time was not HH:MM (${time})`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error(`USNO phase time was out of range (${time})`);
  }
  return { hour, minute };
}

function usnoErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  return "USNO could not compute this request";
}

function readYearPhases(body: unknown): UtcQuarterEvent[] {
  if (!body || typeof body !== "object") {
    throw new Error("USNO year response was empty");
  }
  const record = body as UsnoYearBody;
  const failure = usnoErrorMessage(record.error);
  if (failure) throw new Error(failure);
  if (!Array.isArray(record.phasedata) || record.phasedata.length === 0) {
    throw new Error("USNO year response did not include phasedata");
  }

  return record.phasedata.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("USNO phasedata entry was empty");
    }
    const phase = entry as {
      year?: unknown;
      month?: unknown;
      day?: unknown;
      time?: unknown;
      phase?: unknown;
    };
    if (
      typeof phase.year !== "number" ||
      typeof phase.month !== "number" ||
      typeof phase.day !== "number" ||
      typeof phase.time !== "string" ||
      typeof phase.phase !== "string"
    ) {
      throw new Error("USNO phasedata entry was missing fields");
    }
    const clock = parseUsnoClock(phase.time);
    return {
      year: phase.year,
      month: phase.month,
      day: phase.day,
      hour: clock.hour,
      minute: clock.minute,
      phase: phase.phase,
    };
  });
}

function readOneDay(body: unknown): { curphase: string; fracillum: string } {
  if (!body || typeof body !== "object") {
    throw new Error("USNO day response was empty");
  }
  const record = body as UsnoOneDayBody;
  const failure = usnoErrorMessage(record.error);
  if (failure) throw new Error(failure);
  const data = record.properties?.data;
  if (!data || typeof data.curphase !== "string" || typeof data.fracillum !== "string") {
    throw new Error("USNO day response was missing curphase or fracillum");
  }
  return { curphase: data.curphase, fracillum: data.fracillum };
}

async function usnoJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`USNO ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function loadYearPhases(year: number): Promise<UtcQuarterEvent[]> {
  const cached = yearCache.get(year);
  if (cached) return Promise.resolve(cached);
  const existing = yearInflight.get(year);
  if (existing) return existing;

  const url = `${USNO_ORIGIN}/api/moon/phases/year?year=${year}`;
  const promise = usnoJson(url)
    .then((body) => {
      const phases = readYearPhases(body);
      yearCache.set(year, phases);
      return phases;
    })
    .finally(() => {
      yearInflight.delete(year);
    });

  yearInflight.set(year, promise);
  return promise;
}

function oneDayUrl(year: number, month: number, day: number, latitude: number, longitude: number, tz: string): string {
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return `${USNO_ORIGIN}/api/rstt/oneday?date=${date}&coords=${latitude},${longitude}&tz=${tz}`;
}

async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchMoonMonth(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  zone: PlaceZone,
  cacheKey: string,
): Promise<MoonMonthResult> {
  if (daysInMonth(year, month) < 28) {
    throw new Error("Could not build the dates for this month");
  }

  const yearsToLoad = month === 1 && year > 1700 ? [year - 1, year] : [year];
  const phaseLists = await Promise.all(yearsToLoad.map((phaseYear) => loadYearPhases(phaseYear)));
  const quartersByDate = kolkataQuarterEventsInMonth(phaseLists.flat(), year, month);
  const dates = monthDates(year, month);

  const rows = await mapPool(dates, DAY_CONCURRENCY, async (date) => {
    const tz = usnoTzForCivilDate(zone, date.year, date.month, date.day);
    const url = oneDayUrl(date.year, date.month, date.day, latitude, longitude, tz);
    const day = readOneDay(await usnoJson(url));
    return {
      year: date.year,
      month: date.month,
      day: date.day,
      weekday: gregorianWeekday(date.year, date.month, date.day),
      phase: day.curphase,
      illumination: parseFracillum(day.fracillum),
      quarters: quartersByDate.get(kolkataDateKey(date)) ?? [],
    };
  });

  if (rows.length !== dates.length || rows.some((row) => !row?.phase)) {
    throw new Error("USNO did not return every day of the month");
  }

  return {
    cacheKey,
    year,
    month,
    timeZoneLabel: zone.timeZone ?? zone.cacheToken,
    rows,
  };
}

/**
 * Load one calendar month of moon phases for a place.
 * Completed months stay in memory. A second call with the same key joins the in-flight request.
 */
export function loadMoonMonth(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
): Promise<MoonMonthResult> {
  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  const zone = resolvePlaceZone(lat, lon);
  const cacheKey = moonMonthCacheKey(year, month, lat, lon, zone.cacheToken);
  const cached = monthCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = monthInflight.get(cacheKey);
  if (existing) return existing;

  const promise = fetchMoonMonth(year, month, lat, lon, zone, cacheKey)
    .then((result) => {
      monthCache.set(cacheKey, result);
      return result;
    })
    .finally(() => {
      monthInflight.delete(cacheKey);
    });

  monthInflight.set(cacheKey, promise);
  return promise;
}
