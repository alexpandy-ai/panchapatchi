import * as Astronomy from "astronomy-engine";
import type { AppLanguage } from "../context/LanguageContext";
import { placeLocale, thithiIndexLabel } from "./labels";

/**
 * Thithi calendar for a selected place.
 * 32 sectors of 11.25°, assigned by the place's local sunset.
 * Sunrise/sunset here are the app-wide ones (Sun's centre at 0°), also used for jamams.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const FIRST_YEAR = 1950;
const FIXED_SUNRISE_HOUR = 6;
const FIXED_SUNSET_HOUR = 18;
const MAX_CACHED_PLACES = 6;
const AU_KM = 149_597_870.7;

export interface ThithiPlace {
  /** `null` uses a fixed 06:00 sunrise and 18:00 sunset (the app's no-location default). */
  coords: { lat: number; lng: number } | null;
  /** IANA zone for local dates; `null` uses `offsetMinutes`. */
  timeZone: string | null;
  /** Fixed UTC offset used only when `timeZone` is null. */
  offsetMinutes?: number;
}

/** Why a date needs review; translated only at display time (see `reviewReasonText`). */
export type ReviewReason =
  | { code: "unnamedSector"; angle: number; endAngle: number }
  | { code: "unnamedBoundary" }
  | { code: "multipleBoundaries"; events: { angle: number; index: number | null }[] }
  | { code: "sameAsPrevious" }
  | { code: "skippedSectors"; step: number }
  | { code: "sameAsNext" };

export interface SectorEvent {
  anchor: number;
  date: string;
  full: string;
  sunset: string;
  intervalStart: string;
  intervalEnd: string;
  angle: number;
  endAngle: number;
  index: number | null;
  sector: number;
}

export interface CalendarDay {
  date: string;
  d: number;
  month: number;
  assumed: number | null;
  actual: number;
  mark: string;
  anchor: string;
  full: string;
  angle: number;
  endAngle: number;
  anchorIndex: number | null;
  rise: string;
  events: SectorEvent[];
  reasons: ReviewReason[];
  critical: boolean;
  nextAnchor: string;
}

export interface MoonSample {
  date: string;
  time: Date;
  phase: number;
  longitude: number;
  distance: number;
}

interface PlaceState {
  place: ThithiPlace;
  observer: Astronomy.Observer | null;
  anchors: SectorEvent[];
  yearCache: Map<number, CalendarDay[]>;
  loadedYears: Set<number>;
  eventKeys: Set<string>;
  midnights: Map<string, number>;
  sunsets: Map<string, number>;
  sunrises: Map<string, number>;
}

interface PhaseEvent {
  sector: number;
  time: Date;
}

const placeStates = new Map<string, PlaceState>();
const phaseEventCache = new Map<number, PhaseEvent[]>();
const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

export function firstCalendarYear(): number {
  return FIRST_YEAR;
}

export function placeKey(place: ThithiPlace): string {
  const coords = place.coords ? `${place.coords.lat.toFixed(5)},${place.coords.lng.toFixed(5)}` : "fixed";
  const zone = place.timeZone ?? `utc${place.offsetMinutes ?? 0}`;
  return `${coords}|${zone}`;
}

function stateFor(place: ThithiPlace): PlaceState {
  const key = placeKey(place);
  const existing = placeStates.get(key);
  if (existing) return existing;
  if (placeStates.size >= MAX_CACHED_PLACES) {
    const oldest = placeStates.keys().next().value;
    if (oldest !== undefined) placeStates.delete(oldest);
  }
  const state: PlaceState = {
    place,
    observer: place.coords ? new Astronomy.Observer(place.coords.lat, place.coords.lng, 0) : null,
    anchors: [],
    yearCache: new Map(),
    loadedYears: new Set(),
    eventKeys: new Set(),
    midnights: new Map(),
    sunsets: new Map(),
    sunrises: new Map(),
  };
  placeStates.set(key, state);
  return state;
}

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Local − UTC offset of the place at `time`, in milliseconds (DST-aware for IANA zones). */
function offsetMs(place: ThithiPlace, time: number): number {
  if (!place.timeZone) return (place.offsetMinutes ?? 0) * 60_000;
  const parts = zoneFormatter(place.timeZone).formatToParts(new Date(time));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const hour = value("hour") % 24;
  const wall = Date.UTC(value("year"), value("month") - 1, value("day"), hour, value("minute"), value("second"));
  return wall - Math.floor(time / 1000) * 1000;
}

/** `YYYY-MM-DD` shifted by whole civil days. */
export function addDays(dateKey: string, days: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function localDateKey(place: ThithiPlace, time: Date): string {
  return new Date(time.getTime() + offsetMs(place, time.getTime())).toISOString().slice(0, 10);
}

/** Instant of a local wall-clock time on `dateKey` at the place. */
function localInstant(place: ThithiPlace, dateKey: string, msOfDay: number): number {
  const wall = Date.parse(`${dateKey}T00:00:00Z`) + msOfDay;
  let time = wall - offsetMs(place, wall);
  time = wall - offsetMs(place, time);
  // A DST jump can skip local midnight; move into the requested date.
  for (let step = 0; step < 3 && localDateKey(place, new Date(time)) < dateKey; step += 1) {
    time += HOUR_MS;
  }
  return time;
}

export function localMidnight(place: ThithiPlace, dateKey: string): Date {
  return new Date(midnightMs(stateFor(place), dateKey));
}

function midnightMs(state: PlaceState, dateKey: string): number {
  let value = state.midnights.get(dateKey);
  if (value === undefined) {
    value = localInstant(state.place, dateKey, 0);
    state.midnights.set(dateKey, value);
  }
  return value;
}

/** Sunrise and sunset: the Sun's centre at this geometric altitude (no refraction). */
export const SUN_HORIZON_ALTITUDE = 0;

function searchSunAltitudeIn(
  state: PlaceState,
  observer: Astronomy.Observer,
  dateKey: string,
  direction: 1 | -1,
  altitude: number,
): Date | null {
  const start = midnightMs(state, dateKey);
  const end = midnightMs(state, addDays(dateKey, 1));
  const found = Astronomy.SearchAltitude(
    Astronomy.Body.Sun,
    observer,
    direction,
    new Date(start),
    (end - start) / DAY_MS,
    altitude,
  );
  return found && found.date.getTime() < end ? found.date : null;
}

/**
 * When the Sun's centre crosses `altitude` on the place's civil date
 * (`direction` 1 = rising, −1 = setting); `null` if not on that date.
 */
export function searchSunAltitude(
  place: ThithiPlace & { coords: NonNullable<ThithiPlace["coords"]> },
  dateKey: string,
  direction: 1 | -1,
  altitude: number,
): Date | null {
  const state = stateFor(place);
  return state.observer ? searchSunAltitudeIn(state, state.observer, dateKey, direction, altitude) : null;
}

function sunsetOn(state: PlaceState, dateKey: string): Date {
  const cached = state.sunsets.get(dateKey);
  if (cached !== undefined) return new Date(cached);
  const sunset = state.observer
    ? astroDate(
        searchSunAltitudeIn(state, state.observer, dateKey, -1, SUN_HORIZON_ALTITUDE),
        "அஸ்தமனம்",
      )
    : new Date(localInstant(state.place, dateKey, FIXED_SUNSET_HOUR * HOUR_MS));
  state.sunsets.set(dateKey, sunset.getTime());
  return sunset;
}

function sunriseOn(state: PlaceState, dateKey: string): Date {
  const cached = state.sunrises.get(dateKey);
  if (cached !== undefined) return new Date(cached);
  const sunrise = state.observer
    ? astroDate(
        searchSunAltitudeIn(state, state.observer, dateKey, 1, SUN_HORIZON_ALTITUDE),
        "உதயம்",
      )
    : new Date(localInstant(state.place, dateKey, FIXED_SUNRISE_HOUR * HOUR_MS));
  state.sunrises.set(dateKey, sunrise.getTime());
  return sunrise;
}

/** Sunrise (Sun's centre at 0°) on a civil date at the place; fixed 06:00 without coords. */
export function placeSunrise(place: ThithiPlace, dateKey: string): Date {
  return sunriseOn(stateFor(place), dateKey);
}

/** Sunset (Sun's centre at 0°) on a civil date at the place; fixed 18:00 without coords. */
export function placeSunset(place: ThithiPlace, dateKey: string): Date {
  return sunsetOn(stateFor(place), dateKey);
}
/** Instant of a wall-clock time (`msOfDay` after local midnight) on `dateKey` in the place's zone. */
export function placeWallClockInstant(place: ThithiPlace, dateKey: string, msOfDay: number): Date {
  return new Date(localInstant(place, dateKey, msOfDay));
}

export interface EffectiveCalculation {
  /** Civil date of the selected instant at the place. */
  selectedDateKey: string;
  /** Civil date whose daily thithi is active: the previous date before that date's sunrise. */
  effectiveDateKey: string;
  /** Sunrise of the effective date. */
  cycleStart: Date;
  /** Next sunrise, searched independently from the following civil date's midnight. */
  cycleEnd: Date;
  beforeSunrise: boolean;
}

/**
 * The daily result changes at the place's sunrise, not at midnight.
 * Selected time before sunrise → previous civil date's sunrise-to-sunrise cycle.
 */
export function effectiveCalculationDate(place: ThithiPlace, selectedInstant: Date): EffectiveCalculation {
  const state = stateFor(place);
  const selectedDateKey = localDateKey(place, selectedInstant);
  const sunrise = sunriseOn(state, selectedDateKey);
  if (selectedInstant.getTime() < sunrise.getTime()) {
    const effectiveDateKey = addDays(selectedDateKey, -1);
    return {
      selectedDateKey,
      effectiveDateKey,
      cycleStart: sunriseOn(state, effectiveDateKey),
      cycleEnd: sunrise,
      beforeSunrise: true,
    };
  }
  return {
    selectedDateKey,
    effectiveDateKey: selectedDateKey,
    cycleStart: sunrise,
    cycleEnd: sunriseOn(state, addDays(selectedDateKey, 1)),
    beforeSunrise: false,
  };
}

/** Wall-clock parts of `time` at the place. */
export function placeWallClock(
  place: ThithiPlace,
  time: Date,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const shifted = new Date(time.getTime() + offsetMs(place, time.getTime()));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** `YYYY-MM-DD HH:MM:SS` (24 h) at the place. */
export function formatPlaceInstant(time: Date, place: ThithiPlace): string {
  const { year, month, day, hour, minute, second } = placeWallClock(place, time);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function placeToday(place: ThithiPlace): string {
  return localDateKey(place, new Date());
}

export function lastCalendarYear(place: ThithiPlace): number {
  return Number(placeToday(place).slice(0, 4));
}

export function sectorIndex(sector: number): number | null {
  if (sector === 0) return 14;
  if (sector <= 14) return sector + 14;
  if (sector === 15) return null;
  if (sector === 16) return 29;
  if (sector <= 30) return sector - 17;
  return null;
}

export function thithiLabel(index: number | null, language: AppLanguage = "ta"): string {
  return thithiIndexLabel(index, language);
}

export function degreeRange(index: number): string {
  const sector = Array.from({ length: 32 }, (_, n) => n).find((n) => sectorIndex(n) === index);
  if (sector === undefined) return "";
  return `${sector * 11.25}°–${(sector + 1) * 11.25}°`;
}

export function formatPlaceTime(iso: string, place: ThithiPlace, language: AppLanguage = "ta"): string {
  const options = { dateStyle: "medium", timeStyle: "short" } as const;
  const locale = placeLocale(language);
  if (place.timeZone) {
    return new Date(iso).toLocaleString(locale, { ...options, timeZone: place.timeZone });
  }
  const shifted = Date.parse(iso) + offsetMs(place, Date.parse(iso));
  return new Date(shifted).toLocaleString(locale, { ...options, timeZone: "UTC" });
}

function astroDate(result: Astronomy.AstroTime | Date | null, label: string): Date {
  if (!result) throw new Error(`${label} கிடைக்கவில்லை`);
  return result instanceof Date ? result : result.date;
}

function anchorForFull(
  state: PlaceState,
  full: Date,
): Omit<SectorEvent, "angle" | "endAngle" | "index" | "sector"> {
  const dateKey = localDateKey(state.place, full);
  const sunset = sunsetOn(state, dateKey);
  const date = full.getTime() >= sunset.getTime() ? addDays(dateKey, 1) : dateKey;
  return {
    anchor: midnightMs(state, date),
    date,
    full: full.toISOString(),
    sunset: sunset.toISOString(),
    intervalStart: sunsetOn(state, addDays(date, -1)).toISOString(),
    intervalEnd: sunsetOn(state, date).toISOString(),
  };
}

/** Moon–Sun sector crossings are geocentric, so they are shared by every place. */
function phaseEvents(year: number): PhaseEvent[] {
  const cached = phaseEventCache.get(year);
  if (cached) return cached;
  const events: PhaseEvent[] = [];
  for (let sector = 0; sector < 32; sector += 1) {
    let cursor = new Date(`${year - 1}-11-01T00:00:00Z`);
    const end = Date.parse(`${year + 1}-02-01`);
    while (cursor.getTime() < end) {
      const time = astroDate(
        Astronomy.SearchMoonPhase(sector * 11.25, cursor, 40),
        `${sector * 11.25}° கோணம்`,
      );
      if (time.getTime() <= cursor.getTime()) {
        cursor = new Date(cursor.getTime() + DAY_MS);
        continue;
      }
      events.push({ sector, time });
      cursor = new Date(time.getTime() + DAY_MS);
    }
  }
  phaseEventCache.set(year, events);
  return events;
}

function ensureYear(state: PlaceState, year: number): void {
  if (state.loadedYears.has(year)) return;
  for (const { sector, time } of phaseEvents(year)) {
    const key = `${sector}:${Math.round(time.getTime() / DAY_MS)}`;
    if (state.eventKeys.has(key)) continue;
    state.eventKeys.add(key);
    state.anchors.push({
      ...anchorForFull(state, time),
      angle: sector * 11.25,
      endAngle: (sector + 1) * 11.25,
      index: sectorIndex(sector),
      sector,
    });
  }
  state.anchors.sort((a, b) => a.anchor - b.anchor || Date.parse(a.full) - Date.parse(b.full));
  state.loadedYears.add(year);
}

export function peekCalendarYear(year: number, place: ThithiPlace): CalendarDay[] | undefined {
  return placeStates.get(placeKey(place))?.yearCache.get(year);
}

export function calendarYear(year: number, place: ThithiPlace): CalendarDay[] {
  const state = stateFor(place);
  const cached = state.yearCache.get(year);
  if (cached) return cached;
  const lastYear = lastCalendarYear(place);
  if (year < FIRST_YEAR || year > lastYear) throw new Error("தேதி வரம்புக்கு வெளியே");
  ensureYear(state, year);

  const { anchors } = state;
  const eventsByDate = new Map<string, SectorEvent[]>();
  for (const event of anchors) {
    if (!event.date.startsWith(`${year}-`)) continue;
    const list = eventsByDate.get(event.date);
    if (list) list.push(event);
    else eventsByDate.set(event.date, [event]);
  }

  const rows: CalendarDay[] = [];
  let anchorIndex = 0;
  const active = (time: number): SectorEvent => {
    while (anchorIndex + 1 < anchors.length && anchors[anchorIndex + 1].anchor <= time) anchorIndex += 1;
    return anchors[anchorIndex];
  };

  const first = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  let prior = active(midnightMs(state, addDays(first, -1)));

  for (let date = first; date < end; date = addDays(date, 1)) {
    const current = active(midnightMs(state, date));
    const events = eventsByDate.get(date) ?? [];
    const rise = sunriseOn(state, date);
    const reasons: ReviewReason[] = [];
    if (current.index === null) {
      reasons.push({ code: "unnamedSector", angle: current.angle, endAngle: current.endAngle });
    }
    if (events.some((event) => event.index === null) && current.index !== null) {
      reasons.push({ code: "unnamedBoundary" });
    }
    if (events.length > 1) {
      reasons.push({
        code: "multipleBoundaries",
        events: events.map((event) => ({ angle: event.angle, index: event.index })),
      });
    }
    if (current.sector === prior.sector) {
      reasons.push({ code: "sameAsPrevious" });
    }
    const step = (current.sector - prior.sector + 32) % 32;
    if (step > 1) {
      reasons.push({ code: "skippedSectors", step });
    }
    const actual = (Math.floor(Astronomy.MoonPhase(rise) / 12) + 15) % 30;
    const next = anchors[anchorIndex + 1];
    rows.push({
      date,
      d: Number(date.slice(8)),
      month: Number(date.slice(5, 7)),
      assumed: current.index,
      actual,
      mark: actual === 29 ? "●" : actual === 14 ? "★" : "",
      anchor: current.date,
      full: current.full,
      angle: current.angle,
      endAngle: current.endAngle,
      anchorIndex: current.index,
      rise: rise.toISOString(),
      events,
      reasons,
      critical: reasons.length > 0,
      nextAnchor: next ? next.date : "",
    });
    prior = current;
  }

  for (let i = 0; i < rows.length - 1; i += 1) {
    if (rows[i].assumed === rows[i + 1].assumed) {
      rows[i].reasons.push({ code: "sameAsNext" });
      rows[i].critical = true;
    }
  }

  state.yearCache.set(year, rows);
  return rows;
}

export function visibleDates(records: CalendarDay[]): CalendarDay[] {
  const groups: CalendarDay[][] = [];
  for (const record of records) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    if (group && previous && Date.parse(record.date) - Date.parse(previous.date) === DAY_MS) {
      group.push(record);
    } else {
      groups.push([record]);
    }
  }
  return groups.map((group) => group.find((record) => record.date === record.anchor) ?? group[0]);
}

export function annualRows(rows: CalendarDay[]): CalendarDay[] {
  return rows.flatMap((row) =>
    row.events
      .filter((event) => event.index !== null)
      .map((event) => ({ ...row, assumed: event.index, anchor: row.date })),
  );
}

export function monthCells(rows: CalendarDay[], index: number, month: number): CalendarDay[] {
  const collapsed = visibleDates(annualRows(rows).filter((row) => row.assumed === index));
  return visibleDates(collapsed.filter((row) => row.month === month));
}

export function moonSamples(year: number, month: number, place: ThithiPlace): MoonSample[] {
  const state = stateFor(place);
  return calendarYear(year, place)
    .filter((row) => row.month === month)
    .map((row) => {
      const time = sunsetOn(state, row.date);
      const vector = Astronomy.GeoMoon(time);
      return {
        date: row.date,
        time,
        phase: Astronomy.MoonPhase(time),
        longitude: Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, time, true)).elon,
        distance: Math.hypot(vector.x, vector.y, vector.z) * AU_KM,
      };
    });
}
