import { bi, type Bilingual } from "./bilingual";
import {
  COUNTRIES,
  findCountryByName,
  getCountry,
  type Country,
} from "../data/countries";

export interface GeoCoords {
  lat: number;
  lng: number;
}

export type LocationSource = "geolocation" | "manual" | "fallback";

export const LOCATION_DISPLAY = {
  detecting: bi("இடம் கண்டறிகிறது…", "Detecting location…"),
  geolocation: bi("உங்கள் இடம்", "Your location"),
  fallback: bi("6:00 மணி இயல்பு", "6:00 AM default"),
} as const;

export function getLocationCountry(id: string): Country {
  return getCountry(id);
}

export function countryBilingual(country: Country): Bilingual {
  return bi(country.nameTa, country.nameEn);
}

export function countryOptionLabel(country: Country): string {
  return `${country.nameTa} · ${country.nameEn}`;
}

export function resolveCountryInput(value: string): Country | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const byExactLabel = COUNTRIES.find((country) => countryOptionLabel(country) === trimmed);
  if (byExactLabel) return byExactLabel;

  return findCountryByName(trimmed);
}

export function locationLabelBilingual(name: Bilingual): Bilingual {
  return bi(`இடம்: ${name.ta}`, `Location: ${name.en}`);
}

export function locationDisplayLabel(
  source: LocationSource,
  countryName: Bilingual | null,
  geoPending = false,
  manualCoords: GeoCoords | null = null,
): Bilingual {
  if (source === "manual") {
    if (countryName) return countryName;
    if (manualCoords) {
      const label = `${manualCoords.lat.toFixed(4)}, ${manualCoords.lng.toFixed(4)}`;
      return bi(label, label);
    }
  }
  if (geoPending) {
    return LOCATION_DISPLAY.detecting;
  }
  if (source === "geolocation") {
    return LOCATION_DISPLAY.geolocation;
  }
  return LOCATION_DISPLAY.fallback;
}

export function formatCoord(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "");
}

export function coordsToInputValues(coords: GeoCoords | null): { lat: string; lng: string } {
  if (!coords) return { lat: "", lng: "" };
  return { lat: formatCoord(coords.lat), lng: formatCoord(coords.lng) };
}

export function parseCoordInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidCoords(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
