import { bi, DAY_GROUP_EN, WEEKDAY_EN, type Bilingual } from "./bilingual";
import type { PakshaId } from "./paksha";

/** Weekday index: 0 = Sunday … 6 = Saturday */

/** Pancha Patchi menu days (Sat, Thu, Tue, Fri, Wed) — calendar weekday indices. */
export const PANCHA_AVAILABLE_WEEKDAYS: readonly number[] = [6, 4, 2, 5, 3];

const PANCHA_AVAILABLE_WEEKDAY_SET = new Set(PANCHA_AVAILABLE_WEEKDAYS);

/**
 * Display weekday for Pancha Patchi UI. Sunday and Monday are not Pancha days;
 * walk backwards until the previous Pancha available weekday.
 */
export function getPanchaDisplayWeekday(weekday: number): number {
  let day = ((weekday % 7) + 7) % 7;
  for (let i = 0; i < 7; i++) {
    if (PANCHA_AVAILABLE_WEEKDAY_SET.has(day)) return day;
    day = (day - 1 + 7) % 7;
  }
  return PANCHA_AVAILABLE_WEEKDAYS[0];
}

export const TAMIL_WEEKDAYS = [
  "ஞாயிறு",
  "திங்கள்",
  "செவ்வாய்",
  "புதன்",
  "வியாழன்",
  "வெள்ளி",
  "சனி",
] as const;

/**
 * Weekday → Excel day-group key (same for both pakshas).
 * பு = புதன் + சனி, வெ = வெள்ளி, செ = ஞாயிறு + செவ்வாய், வி = வியாழன், ச = திங்கள்
 */
const WEEKDAY_GROUP: Record<number, string> = {
  0: "செ",
  1: "ச",
  2: "செ",
  3: "பு",
  4: "வி",
  5: "வெ",
  6: "பு",
};

/** Calendar weekdays (0–6) that belong to each Excel day group */
export const DAY_GROUP_WEEKDAYS: Record<string, readonly number[]> = {
  பு: [3, 6],
  வெ: [5],
  செ: [0, 2],
  வி: [4],
  ச: [1],
};

/** Representative row labels in the Excel sheets (one name per group) */
export const DAY_GROUP_LABELS: Record<string, string> = {
  ச: "சனி",
  வி: "வியாழன்",
  செ: "செவ்வாய்",
  வெ: "வெள்ளி",
  பு: "புதன்",
};

export function getWeekdayLabel(weekday: number): string {
  return TAMIL_WEEKDAYS[weekday] ?? TAMIL_WEEKDAYS[0];
}

/** Tamil weekday label for Pancha Patchi display (fallback for Sun/Mon). */
export function getDisplayWeekdayLabel(weekday: number): string {
  return getWeekdayLabel(getPanchaDisplayWeekday(weekday));
}

export function getDayGroupLabel(key: string): string {
  return DAY_GROUP_LABELS[key] ?? key;
}

export function getDayGroupMembersLabel(key: string): string {
  return getDayGroupMembersBilingual(key).ta;
}

export function getDayGroupMembersBilingual(key: string): Bilingual {
  const days = DAY_GROUP_WEEKDAYS[key];
  if (!days?.length) {
    const ta = getDayGroupLabel(key);
    return bi(ta, DAY_GROUP_EN[key] ?? ta);
  }
  const ta = days.map((day) => TAMIL_WEEKDAYS[day]).join(", ");
  const en = days.map((day) => WEEKDAY_EN[day]).join(", ");
  return bi(ta, en);
}

/** Table/group label: all member weekdays in Tamil with matching English names. */
export function getDayGroupLabelBilingual(key: string): Bilingual {
  return getDayGroupMembersBilingual(key);
}

export function getDayGroupKey(weekday: number): string {
  return WEEKDAY_GROUP[weekday] ?? "பு";
}

/** Excel group row order per paksha (matches sheet data). */
export const PAKSHA_GROUP_ORDER: Record<PakshaId, readonly string[]> = {
  valarpirai: ["பு", "வெ", "செ", "வி", "ச"],
  theipirai: ["ச", "வி", "செ", "வெ", "பு"],
};

/**
 * Single display weekday per schedule row (not combined group members).
 * Valarpirai: Wed, Fri, Tue, Thu, Sat — theipirai is the reverse.
 */
const PAKSHA_GROUP_WEEKDAYS: Record<PakshaId, readonly number[]> = {
  valarpirai: [3, 5, 2, 4, 6],
  theipirai: [6, 4, 2, 5, 3],
};

export function getPakshaGroupDisplayWeekday(pakshaId: PakshaId, groupKey: string): number | null {
  const order = PAKSHA_GROUP_ORDER[pakshaId];
  const weekdays = PAKSHA_GROUP_WEEKDAYS[pakshaId];
  const idx = order.indexOf(groupKey);
  if (idx === -1) return null;
  return weekdays[idx] ?? null;
}

export function getPakshaGroupDayBilingual(pakshaId: PakshaId, groupKey: string): Bilingual {
  const weekday = getPakshaGroupDisplayWeekday(pakshaId, groupKey);
  if (weekday === null) {
    const ta = getDayGroupLabel(groupKey);
    return bi(ta, DAY_GROUP_EN[groupKey] ?? ta);
  }
  return bi(TAMIL_WEEKDAYS[weekday], WEEKDAY_EN[weekday]);
}
