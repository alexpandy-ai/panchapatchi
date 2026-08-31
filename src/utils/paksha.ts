export type PakshaId = "valarpirai" | "theipirai";

const REFERENCE_NEW_MOON = Date.UTC(2025, 0, 29, 12, 0, 0);
const SYNODIC_MONTH = 29.530588853;

/** Moon phase 0–1 (0 = new moon, 0.5 = full moon). */
export function getMoonPhase(date: Date): number {
  const days = (date.getTime() - REFERENCE_NEW_MOON) / (1000 * 60 * 60 * 24);
  const phase = (((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH) / SYNODIC_MONTH;
  return phase;
}

export function getPakshaFromDate(date: Date): PakshaId {
  const phase = getMoonPhase(date);
  return phase < 0.5 ? "valarpirai" : "theipirai";
}

export const PAKSHA_LABELS: Record<PakshaId, string> = {
  valarpirai: "வளர்பிறை",
  theipirai: "தேய்பிறை",
};
