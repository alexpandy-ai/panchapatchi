import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";
import type { PakshaId } from "./paksha";

export interface ThithiPakshaGroup {
  thithis: readonly [Bilingual, Bilingual, Bilingual];
  planet: Bilingual;
  patchi: (typeof PATCHI_ORDER)[number];
}

/** Weekday for each Thithi Patchi planet abbreviation (Graham → Day). */
export const THITHI_PLANET_DAYS: Record<string, Bilingual> = {
  செ: bi("செவ்வாய்", "Tuesday"),
  பு: bi("புதன்", "Wednesday"),
  வி: bi("வியாழன்", "Thursday"),
  வெ: bi("வெள்ளி", "Friday"),
  ச: bi("சனி", "Saturday"),
};

export function getThithiPlanetDay(planet: Bilingual): Bilingual {
  return THITHI_PLANET_DAYS[planet.ta] ?? planet;
}

/** Calendar weekday index (0–6) for a Thithi Patchi planet row — used by alternate schedule. */
const THITHI_PLANET_WEEKDAY: Record<string, number> = {
  செ: 2,
  பு: 3,
  வி: 4,
  வெ: 5,
  ச: 6,
};

export function getThithiPlanetWeekday(planet: Bilingual): number {
  return THITHI_PLANET_WEEKDAY[planet.ta] ?? 2;
}

/** தேய்பிறை thithi patchi — five groups of three thithis. */
export const THITHI_PATCHI_THEIPIRAI: ThithiPakshaGroup[] = [
  {
    thithis: [bi("பிரதமை", "Prathamai"), bi("சஷ்டி", "Sashti"), bi("ஏகாதசி", "Ekadasi")],
    planet: bi("செ", "Mars"),
    patchi: "ஆந்தை",
  },
  {
    thithis: [bi("துவிதியை", "Dwitiyai"), bi("சப்தமி", "Sapthami"), bi("துவாதசி", "Dwadasi")],
    planet: bi("பு", "Mercury"),
    patchi: "வல்லூறு",
  },
  {
    thithis: [bi("திரிதியை", "Trithiyai"), bi("அஷ்டமி", "Ashtami"), bi("திரியோதசி", "Trayodasi")],
    planet: bi("வி", "Jupiter"),
    patchi: "மயில்",
  },
  {
    thithis: [bi("சதுர்த்தி", "Chathurthi"), bi("நவமி", "Navami"), bi("சதுர்தசி", "Chaturdasi")],
    planet: bi("வெ", "Venus"),
    patchi: "கோழி",
  },
  {
    thithis: [bi("பஞ்சமி", "Panchami"), bi("தசமி", "Dasami"), bi("அமாவாசை", "Amavasya")],
    planet: bi("ச", "Saturn"),
    patchi: "காகம்",
  },
];

/** வளர்பிறை thithi patchi — five groups of three thithis. */
export const THITHI_PATCHI_VALARPIRAI: ThithiPakshaGroup[] = [
  {
    thithis: [bi("பிரதமை", "Prathamai"), bi("சஷ்டி", "Sashti"), bi("ஏகாதசி", "Ekadasi")],
    planet: bi("செ", "Mars"),
    patchi: "கோழி",
  },
  {
    thithis: [bi("துவிதியை", "Dwitiyai"), bi("சப்தமி", "Sapthami"), bi("துவாதசி", "Dwadasi")],
    planet: bi("ச", "Saturn"),
    patchi: "மயில்",
  },
  {
    thithis: [bi("திரிதியை", "Trithiyai"), bi("அஷ்டமி", "Ashtami"), bi("திரியோதசி", "Trayodasi")],
    planet: bi("வெ", "Venus"),
    patchi: "வல்லூறு",
  },
  {
    thithis: [bi("சதுர்த்தி", "Chathurthi"), bi("நவமி", "Navami"), bi("சதுர்தசி", "Chaturdasi")],
    planet: bi("வி", "Jupiter"),
    patchi: "ஆந்தை",
  },
  {
    thithis: [bi("பஞ்சமி", "Panchami"), bi("தசமி", "Dasami"), bi("பௌர்ணமி", "Pournami")],
    planet: bi("பு", "Mercury"),
    patchi: "காகம்",
  },
];

export const THITHI_PATCHI_BY_PAKSHA: Record<PakshaId, ThithiPakshaGroup[]> = {
  theipirai: THITHI_PATCHI_THEIPIRAI,
  valarpirai: THITHI_PATCHI_VALARPIRAI,
};

/** Lunar day 1–15 for each table row and thithi column. */
export const THITHI_NUMBERS_BY_GROUP: readonly (readonly [number, number, number])[] = [
  [1, 6, 11],
  [2, 7, 12],
  [3, 8, 13],
  [4, 9, 14],
  [5, 10, 15],
];

export function getThithiCellPosition(thithiNumber: number): {
  groupIndex: number;
  thithiIndex: number;
} {
  for (let groupIndex = 0; groupIndex < THITHI_NUMBERS_BY_GROUP.length; groupIndex++) {
    const thithiIndex = THITHI_NUMBERS_BY_GROUP[groupIndex].indexOf(thithiNumber);
    if (thithiIndex >= 0) {
      return { groupIndex, thithiIndex };
    }
  }

  return { groupIndex: 0, thithiIndex: 0 };
}

export const THITHI_PATCHI_GROUP_SIZE = 3;
