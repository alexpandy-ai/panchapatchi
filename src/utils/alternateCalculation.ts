import type { ActivitySlot } from "../types";
import { PATCHI_DAYS_TABLE, PANCHA_ACTIVITY_TA } from "./bilingual";
import type { PATCHI_ORDER } from "./bilingual";
import { getPanchaDisplayWeekday, TAMIL_WEEKDAYS } from "./dayGroup";
import type { PeriodId } from "./jamam";
import type { PakshaId } from "./paksha";

/** Night activity cycle: Die → Sleep → Rule → Walk → Eat. */
export const ALTERNATE_NIGHT_ACTIVITY_TA = [
  "சாவு",
  "துயில்",
  "அரசு",
  "நடை",
  "ஊண்",
] as const;

/** @deprecated Use ALTERNATE_NIGHT_ACTIVITY_TA */
export const VALARPIRAI_ALTERNATE_NIGHT_ACTIVITY_TA = ALTERNATE_NIGHT_ACTIVITY_TA;

/** Valarpirai day: Hen → Vulture → Crow → Peacock → Owl. */
export const ALTERNATE_VALARPIRAI_DAY_BIRD_ORDER: readonly (typeof PATCHI_ORDER)[number][] = [
  "கோழி",
  "வல்லூறு",
  "காகம்",
  "மயில்",
  "ஆந்தை",
];

/** Theipirai day activity cycle: Hen → Owl → Peacock → Crow → Vulture. */
export const ALTERNATE_THEIPIRAI_DAY_BIRD_ORDER: readonly (typeof PATCHI_ORDER)[number][] = [
  "கோழி",
  "ஆந்தை",
  "மயில்",
  "காகம்",
  "வல்லூறு",
];

/** @deprecated Use ALTERNATE_VALARPIRAI_DAY_BIRD_ORDER */
export const ALTERNATE_DAY_BIRD_ORDER = ALTERNATE_VALARPIRAI_DAY_BIRD_ORDER;

/** Pancha weekdays in calendar order: Tue → Sat. */
export const ALTERNATE_WEEKDAY_ORDER = [2, 3, 4, 5, 6] as const;

/** @deprecated Use ALTERNATE_WEEKDAY_ORDER */
export const VALARPIRAI_ALTERNATE_WEEKDAY_ORDER = ALTERNATE_WEEKDAY_ORDER;

export const VALARPIRAI_ALTERNATE_GROUP_KEYS = ["செ", "பு", "வி", "வெ", "ச"] as const;
export const THEIPIRAI_ALTERNATE_GROUP_KEYS = ["செ", "பு", "வி", "வெ", "ச"] as const;

const DIE_ACTIVITY_INDEX = 4;
const NIGHT_WALK_ACTIVITY_INDEX = 3;
const NIGHT_EAT_ACTIVITY_INDEX = 4;

const PANCHA_WEEKDAYS = new Set<number>(ALTERNATE_WEEKDAY_ORDER);

type AlternatePakshaId = "valarpirai" | "theipirai";

interface AlternatePakshaConfig {
  birdOrder: readonly (typeof PATCHI_ORDER)[number][];
  patchiDaysKey: "valarpiraiPatchi" | "theipiraiPatchi";
  supportsNight: boolean;
}

const ALTERNATE_PAKSHA_CONFIG: Record<AlternatePakshaId, AlternatePakshaConfig> = {
  valarpirai: {
    birdOrder: ALTERNATE_VALARPIRAI_DAY_BIRD_ORDER,
    patchiDaysKey: "valarpiraiPatchi",
    supportsNight: true,
  },
  theipirai: {
    birdOrder: ALTERNATE_THEIPIRAI_DAY_BIRD_ORDER,
    patchiDaysKey: "theipiraiPatchi",
    supportsNight: true,
  },
};

function birdIndexInOrder(
  bird: (typeof PATCHI_ORDER)[number],
  birdOrder: readonly (typeof PATCHI_ORDER)[number][],
): number {
  const index = birdOrder.indexOf(bird);
  return index === -1 ? 0 : index;
}

function weekdayFromTamilDay(ta: string): number | null {
  const index = TAMIL_WEEKDAYS.indexOf(ta as (typeof TAMIL_WEEKDAYS)[number]);
  return index === -1 ? null : index;
}

/** Jamam 1 Eat bird from Patchi Days table (Information → Patchi Days). */
function jamam1EatBirdIndexFromPatchiDaysTable(
  pakshaKey: "valarpiraiPatchi" | "theipiraiPatchi",
  weekday: number,
  birdOrder: readonly (typeof PATCHI_ORDER)[number][],
): number | null {
  for (const column of PATCHI_DAYS_TABLE) {
    const columnWeekday = weekdayFromTamilDay(column.day.ta);
    if (columnWeekday !== weekday) continue;
    return birdIndexInOrder(column[pakshaKey], birdOrder);
  }
  return null;
}

export function getNextPanchaWeekday(weekday: number): number | null {
  const index = ALTERNATE_WEEKDAY_ORDER.indexOf(
    weekday as (typeof ALTERNATE_WEEKDAY_ORDER)[number],
  );
  if (index === -1 || index >= ALTERNATE_WEEKDAY_ORDER.length - 1) {
    return null;
  }
  return ALTERNATE_WEEKDAY_ORDER[index + 1];
}

function eatBirdIndexForJamam(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
): number | null {
  const config = ALTERNATE_PAKSHA_CONFIG[pakshaId];
  const birdOrder = config.birdOrder;

  if (!PANCHA_WEEKDAYS.has(weekday) || jamam < 1 || jamam > 5) return null;

  if (jamam > 1) {
    const previousJamamEat = eatBirdIndexForJamam(pakshaId, weekday, jamam - 1);
    if (previousJamamEat === null) return null;
    return (previousJamamEat + DIE_ACTIVITY_INDEX) % birdOrder.length;
  }

  return jamam1EatBirdIndexFromPatchiDaysTable(config.patchiDaysKey, weekday, birdOrder);
}

function getAlternateDayActivityForPaksha(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  const birdOrder = ALTERNATE_PAKSHA_CONFIG[pakshaId].birdOrder;
  const eatIndex = eatBirdIndexForJamam(pakshaId, weekday, jamam);
  if (eatIndex === null) return null;

  const activityIndex =
    (birdIndexInOrder(bird, birdOrder) - eatIndex + birdOrder.length) % birdOrder.length;
  return PANCHA_ACTIVITY_TA[activityIndex];
}

function getAlternateDayBirdForActivityForPaksha(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  const birdOrder = ALTERNATE_PAKSHA_CONFIG[pakshaId].birdOrder;
  const eatIndex = eatBirdIndexForJamam(pakshaId, weekday, jamam);
  if (eatIndex === null) return null;

  const index = (eatIndex + activityIndex) % birdOrder.length;
  return birdOrder[index] ?? null;
}

export function alternatePakshaSupportsNight(pakshaId: PakshaId): boolean {
  if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return false;
  return ALTERNATE_PAKSHA_CONFIG[pakshaId].supportsNight;
}

export function getAlternateGroupKey(pakshaId: AlternatePakshaId, weekday: number): string | null {
  const groupKeys =
    pakshaId === "valarpirai" ? VALARPIRAI_ALTERNATE_GROUP_KEYS : THEIPIRAI_ALTERNATE_GROUP_KEYS;
  const index = ALTERNATE_WEEKDAY_ORDER.indexOf(
    weekday as (typeof ALTERNATE_WEEKDAY_ORDER)[number],
  );
  if (index === -1) return null;
  return groupKeys[index] ?? null;
}

/** @deprecated Use getAlternateGroupKey("valarpirai", weekday) */
export function getValarpiraiAlternateGroupKey(weekday: number): string | null {
  return getAlternateGroupKey("valarpirai", weekday);
}

export function getAlternateDayActivity(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateDayActivityForPaksha(pakshaId, weekday, jamam, bird);
}

export function getAlternateDayBirdForActivity(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateDayBirdForActivityForPaksha(pakshaId, weekday, jamam, activityIndex);
}

export function getAlternateValarpiraiDayActivity(
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateDayActivity("valarpirai", weekday, jamam, bird);
}

export function getAlternateValarpiraiDayBirdForActivity(
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateDayBirdForActivity("valarpirai", weekday, jamam, activityIndex);
}

export function getAlternateTheipiraiDayActivity(
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateDayActivity("theipirai", weekday, jamam, bird);
}

export function getAlternateTheipiraiDayBirdForActivity(
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateDayBirdForActivity("theipirai", weekday, jamam, activityIndex);
}

/**
 * Night uses the same jamam eat anchor as day for both pirais.
 * Valarpirai: day Eat → night Die; day Die → night Eat; day Rule → night Rule.
 * Theipirai: day Die → night Eat (same jamam); night Walk (jamam N) → night Eat (jamam N+1).
 */
function getAlternateNightActivityForPaksha(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  const birdOrder = ALTERNATE_PAKSHA_CONFIG[pakshaId].birdOrder;
  const eatIndex = eatBirdIndexForJamam(pakshaId, weekday, jamam);
  if (eatIndex === null) return null;

  const activityIndex =
    (birdIndexInOrder(bird, birdOrder) - eatIndex + birdOrder.length) % birdOrder.length;
  return ALTERNATE_NIGHT_ACTIVITY_TA[activityIndex];
}

function getAlternateNightBirdForActivityForPaksha(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  const birdOrder = ALTERNATE_PAKSHA_CONFIG[pakshaId].birdOrder;
  const eatIndex = eatBirdIndexForJamam(pakshaId, weekday, jamam);
  if (eatIndex === null) return null;

  const index = (eatIndex + activityIndex) % birdOrder.length;
  return birdOrder[index] ?? null;
}

export function getAlternateNightActivity(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateNightActivityForPaksha(pakshaId, weekday, jamam, bird);
}

export function getAlternateNightBirdForActivity(
  pakshaId: AlternatePakshaId,
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateNightBirdForActivityForPaksha(pakshaId, weekday, jamam, activityIndex);
}

export function getAlternateValarpiraiNightActivity(
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateNightActivity("valarpirai", weekday, jamam, bird);
}

export function getAlternateValarpiraiNightBirdForActivity(
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateNightBirdForActivity("valarpirai", weekday, jamam, activityIndex);
}

export function getAlternateTheipiraiNightActivity(
  weekday: number,
  jamam: number,
  bird: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternateNightActivity("theipirai", weekday, jamam, bird);
}

export function getAlternateTheipiraiNightBirdForActivity(
  weekday: number,
  jamam: number,
  activityIndex: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateNightBirdForActivity("theipirai", weekday, jamam, activityIndex);
}

export function getAlternateValarpiraiNextMorningEatBird(
  weekday: number,
  jamam: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateValarpiraiNightBirdForActivity(weekday, jamam, NIGHT_WALK_ACTIVITY_INDEX);
}

export function getAlternateValarpiraiNextMorningWalkBird(
  weekday: number,
  jamam: number,
): (typeof PATCHI_ORDER)[number] | null {
  return getAlternateValarpiraiNightBirdForActivity(weekday, jamam, NIGHT_EAT_ACTIVITY_INDEX);
}

/** Anthara dialog for alternate schedule uses five segments (day jamams 1–5 only). */
export const ALTERNATE_ANTHARA_SEGMENT_COUNT = 5;

/** One patchi's activity for a Pancha weekday (Tue–Sat) from alternate-schedule rules. */
export function getAlternatePatchiJamamActivityForWeekday(
  pakshaId: AlternatePakshaId,
  weekday: number,
  yama: number,
  period: PeriodId,
  patchi: (typeof PATCHI_ORDER)[number],
): string | null {
  return period === "day"
    ? getAlternateDayActivity(pakshaId, weekday, yama, patchi)
    : getAlternateNightActivity(pakshaId, weekday, yama, patchi);
}

/** One patchi's activity in the current jamam from alternate-schedule rules. */
export function getAlternatePatchiJamamActivity(
  pakshaId: AlternatePakshaId,
  calendarWeekday: number,
  yama: number,
  period: PeriodId,
  patchi: (typeof PATCHI_ORDER)[number],
): string | null {
  return getAlternatePatchiJamamActivityForWeekday(
    pakshaId,
    getPanchaDisplayWeekday(calendarWeekday),
    yama,
    period,
    patchi,
  );
}

/** Activity slots for one alternate-schedule jamam column. */
export function getAlternateJamamActivitySlots(
  pakshaId: AlternatePakshaId,
  weekday: number,
  yama: number,
  period: PeriodId,
): ActivitySlot[] {
  const activityList =
    period === "day" ? PANCHA_ACTIVITY_TA : ALTERNATE_NIGHT_ACTIVITY_TA;

  return activityList.map((activityTa, activityIndex) => {
    const bird =
      period === "day"
        ? getAlternateDayBirdForActivity(pakshaId, weekday, yama, activityIndex)
        : getAlternateNightBirdForActivity(pakshaId, weekday, yama, activityIndex);

    return {
      activity: activityTa,
      bird: bird ?? "—",
    };
  });
}
