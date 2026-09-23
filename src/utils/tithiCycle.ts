import { bi, type Bilingual } from "./bilingual";
import { tithiAngle, tithiNumberFromAngle } from "./ecliptic";
import type { GeoCoords } from "./location";

/** Mean synodic month (days). Used only as a search hint — durations come from ephemeris. */
export const MEAN_SYNODIC_DAYS = 29.530588853;

/** Fundamental rule: one Tithi = 12° of Sun–Moon elongation. */
export const TITHI_SPAN_DEG = 12;

export type TithiPaksha = "shukla" | "krishna";

export interface TithiDefinition {
  sno: number;
  paksha: TithiPaksha;
  name: Bilingual;
  startDeg: number;
  endDeg: number;
  isPournami: boolean;
  isAmavasai: boolean;
}

const TITHI_NAMES: Bilingual[] = [
  bi("பிரதமை", "Pratipada"),
  bi("துவிதியை", "Dvitiya"),
  bi("திரிதியை", "Tritiya"),
  bi("சதுர்த்தி", "Chaturthi"),
  bi("பஞ்சமி", "Panchami"),
  bi("சஷ்டி", "Shashti"),
  bi("சப்தமி", "Saptami"),
  bi("அஷ்டமி", "Ashtami"),
  bi("நவமி", "Navami"),
  bi("தசமி", "Dashami"),
  bi("ஏகாதசி", "Ekadashi"),
  bi("துவாதசி", "Dwadashi"),
  bi("திரியோதசி", "Trayodashi"),
  bi("சதுர்தசி", "Chaturdashi"),
];

export const PAKSHA_LABELS: Record<TithiPaksha, Bilingual> = {
  shukla: bi("சுக்ல", "Shukla"),
  krishna: bi("கிருஷ்ண", "Krishna"),
};

function tithiName(sno: number): Bilingual {
  if (sno === 15) return bi("பௌர்ணமி", "Pournami");
  if (sno === 30) return bi("அமாவாசை", "Amavasai");
  return TITHI_NAMES[(sno - 1) % 15] ?? TITHI_NAMES[0];
}

export const TITHI_DEFINITIONS: TithiDefinition[] = Array.from({ length: 30 }, (_, index) => {
  const sno = index + 1;
  const paksha: TithiPaksha = sno <= 15 ? "shukla" : "krishna";
  return {
    sno,
    paksha,
    name: tithiName(sno),
    startDeg: index * TITHI_SPAN_DEG,
    endDeg: (index + 1) * TITHI_SPAN_DEG,
    isPournami: sno === 15,
    isAmavasai: sno === 30,
  };
});

export interface TithiRow {
  sno: number;
  paksha: TithiPaksha;
  pakshaLabel: Bilingual;
  name: Bilingual;
  startDeg: number;
  endDeg: number;
  degreeRange: string;
  start: Date;
  end: Date;
  durationMs: number;
  isPournami: boolean;
  isAmavasai: boolean;
  isCurrent: boolean;
}

export interface CurrentTithiSummary {
  name: Bilingual;
  pakshaLabel: Bilingual;
  degree: number;
  start: Date;
  end: Date;
  remainingMs: number;
}

export interface TithiCycleTable {
  rows: TithiRow[];
  current: CurrentTithiSummary;
  cycleStart: Date;
  cycleEnd: Date;
  currentAngle: number;
  timeZone: string;
}

const MS_PER_DAY = 86_400_000;
const DEG_PER_DAY = 360 / MEAN_SYNODIC_DAYS;

function signedNewMoonError(date: Date): number {
  let angle = tithiAngle(date);
  if (angle > 180) angle -= 360;
  return angle;
}

function newtonCrossing(
  errorAt: (date: Date) => number,
  hintMs: number,
  maxIter = 18,
): number {
  let t = hintMs;
  for (let i = 0; i < maxIter; i++) {
    const err = errorAt(new Date(t));
    const sample = errorAt(new Date(t + 3_600_000));
    const rate = (sample - err) / 3_600_000;
    if (!Number.isFinite(rate) || Math.abs(rate) < 1e-18) break;
    const step = err / rate;
    t -= step;
    if (Math.abs(step) < 250) break;
  }
  return t;
}

/** Instant of the Amavasai (0°) that starts the lunar cycle containing `date`. */
export function findCycleStartAmavasai(date: Date): Date {
  const angle = tithiAngle(date);
  const hintMs = date.getTime() - (angle / 360) * MEAN_SYNODIC_DAYS * MS_PER_DAY;
  let t = newtonCrossing(signedNewMoonError, hintMs);

  if (t > date.getTime() + 2_000) {
    t = newtonCrossing(signedNewMoonError, t - MEAN_SYNODIC_DAYS * MS_PER_DAY);
  }

  return new Date(t);
}

function unwrappedElongation(date: Date, origin: Date): number {
  const raw = tithiAngle(date);
  const days = (date.getTime() - origin.getTime()) / MS_PER_DAY;
  const expected = days * DEG_PER_DAY;
  const k = Math.round((expected - raw) / 360);
  return raw + k * 360;
}

function findElongationTarget(targetDeg: number, origin: Date): Date {
  const hintMs = origin.getTime() + (targetDeg / 360) * MEAN_SYNODIC_DAYS * MS_PER_DAY;
  const t = newtonCrossing(
    (moment) => unwrappedElongation(moment, origin) - targetDeg,
    hintMs,
  );
  return new Date(t);
}

export function guessTimeZone(coords: GeoCoords | null): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (!coords) return fallback;

  const { lat, lng } = coords;

  if (lat >= 5.7 && lat <= 10 && lng >= 79.4 && lng <= 82.1) return "Asia/Colombo";
  if (lat >= 26.3 && lat <= 30.5 && lng >= 80 && lng <= 88.3) return "Asia/Kathmandu";
  if (lat >= 20.5 && lat <= 26.7 && lng >= 88 && lng <= 92.7) return "Asia/Dhaka";
  if (lat >= 23.6 && lat <= 37.1 && lng >= 60.8 && lng <= 77.9) return "Asia/Karachi";
  if (lat >= 6.5 && lat <= 35.7 && lng >= 68 && lng <= 97.4) return "Asia/Kolkata";
  if (lat >= 22.6 && lat <= 26.1 && lng >= 51.5 && lng <= 56.6) return "Asia/Dubai";
  if (lat >= 1 && lat <= 7.5 && lng >= 99.6 && lng <= 104.5) return "Asia/Singapore";
  if (lat >= 5.5 && lat <= 20.5 && lng >= 97.3 && lng <= 105.7) return "Asia/Bangkok";
  if (lat >= 49.8 && lat <= 58.7 && lng >= -8.2 && lng <= 1.8) return "Europe/London";
  if (lat >= 24 && lat <= 49 && lng >= -85 && lng <= -66.9) return "America/New_York";
  if (lat >= 25 && lat <= 49 && lng >= -104 && lng <= -85) return "America/Chicago";
  if (lat >= 31 && lat <= 49 && lng >= -115 && lng <= -104) return "America/Denver";
  if (lat >= 32.5 && lat <= 49 && lng >= -124.8 && lng <= -114) return "America/Los_Angeles";
  if (lat >= -39 && lat <= -10 && lng >= 141 && lng <= 154) return "Australia/Sydney";

  return fallback;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTithiDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${day} ${month} ${year}`;
}

export function formatTithiTime12(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "AM").toUpperCase();
  return `${hour}:${minute} ${period}`;
}

export function formatTithiDateTime(date: Date, timeZone: string): string {
  return `${formatTithiDate(date, timeZone)}, ${formatTithiTime12(date, timeZone)}`;
}

export function formatDurationHHMM(ms: number): string {
  const totalMins = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function formatDegree(value: number, digits = 0): string {
  return `${value.toFixed(digits)}°`;
}

export function formatDegreeRange(startDeg: number, endDeg: number): string {
  return `${formatDegree(startDeg)}–${formatDegree(endDeg)}`;
}

/**
 * Complete Amavasai → next Amavasai Tithi table for the selected instant.
 * Start/end times are the exact 12° elongation crossings, not 24-hour slots.
 */
export function buildTithiCycleTable(
  selectedDateTime: Date,
  coords: GeoCoords | null,
): TithiCycleTable {
  const timeZone = guessTimeZone(coords);
  const cycleStart = findCycleStartAmavasai(selectedDateTime);
  const crossings: Date[] = [cycleStart];

  for (let i = 1; i <= 30; i++) {
    crossings.push(findElongationTarget(i * TITHI_SPAN_DEG, cycleStart));
  }

  const cycleEnd = crossings[30];
  const currentAngle = tithiAngle(selectedDateTime);
  const currentNumber = tithiNumberFromAngle(currentAngle);

  const rows: TithiRow[] = TITHI_DEFINITIONS.map((definition, index) => {
    const start = crossings[index];
    const end = crossings[index + 1];
    return {
      sno: definition.sno,
      paksha: definition.paksha,
      pakshaLabel: PAKSHA_LABELS[definition.paksha],
      name: definition.name,
      startDeg: definition.startDeg,
      endDeg: definition.endDeg,
      degreeRange: formatDegreeRange(definition.startDeg, definition.endDeg),
      start,
      end,
      durationMs: end.getTime() - start.getTime(),
      isPournami: definition.isPournami,
      isAmavasai: definition.isAmavasai,
      isCurrent: definition.sno === currentNumber,
    };
  });

  const currentRow = rows.find((row) => row.isCurrent) ?? rows[0];

  return {
    rows,
    current: {
      name: currentRow.name,
      pakshaLabel: currentRow.pakshaLabel,
      degree: currentAngle,
      start: currentRow.start,
      end: currentRow.end,
      remainingMs: Math.max(0, currentRow.end.getTime() - selectedDateTime.getTime()),
    },
    cycleStart,
    cycleEnd,
    currentAngle,
    timeZone,
  };
}
