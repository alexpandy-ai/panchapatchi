import type { PakshaId } from "../utils/paksha";

/**
 * Stable thithi identifiers shared by Thithi Details and Home.
 *
 * Calendar index (0–29), as produced by the 32-sector mapping:
 *   0–13  தேய்பிறை பிரதமை … சதுர்தசி
 *   14    அமாவாசை
 *   15–28 வளர்பிறை பிரதமை … சதுர்தசி
 *   29    பௌர்ணமி
 *
 * Home selection: Pirai id + thithi number 1–15 (Thithi Patchi table).
 * Theipirai 15 is அமாவாசை; Valarpirai 15 is பௌர்ணமி.
 */
export interface ThithiSelection {
  pakshaId: PakshaId;
  /** 1–15 within the pirai. */
  thithiNumber: number;
}

export const AMAVASAI_INDEX = 14;
export const POURNAMI_INDEX = 29;

export function thithiIndexToSelection(index: number): ThithiSelection {
  if (!Number.isInteger(index) || index < 0 || index > 29) {
    throw new RangeError(`Thithi index out of range: ${index}`);
  }
  return index < 15
    ? { pakshaId: "theipirai", thithiNumber: index + 1 }
    : { pakshaId: "valarpirai", thithiNumber: index - 14 };
}

export function selectionToThithiIndex({ pakshaId, thithiNumber }: ThithiSelection): number {
  if (!Number.isInteger(thithiNumber) || thithiNumber < 1 || thithiNumber > 15) {
    throw new RangeError(`Thithi number out of range: ${thithiNumber}`);
  }
  return pakshaId === "theipirai" ? thithiNumber - 1 : thithiNumber + 14;
}

/** Pirai on either side of an unnamed sector: 168.75°–180° is waxing, 348.75°–360° waning. */
export function piraiForSector(sector: number): PakshaId {
  return sector < 16 ? "valarpirai" : "theipirai";
}
