import * as SunCalc from "suncalc";

export type PakshaId = "valarpirai" | "theipirai";

/** Moon phase 0–1 (0 = new moon, 0.5 = full moon). */
export function getMoonPhase(date: Date): number {
  return SunCalc.getMoonIllumination(date).phase;
}

export function getPakshaFromDate(date: Date): PakshaId {
  const phase = getMoonPhase(date);
  return phase < 0.5 ? "valarpirai" : "theipirai";
}

export const PAKSHA_LABELS: Record<PakshaId, string> = {
  valarpirai: "வளர்பிறை",
  theipirai: "தேய்பிறை",
};
