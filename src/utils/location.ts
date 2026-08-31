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
  fallback: bi("6:00 மணி இயல்பு", "6:00 AM default"),
} as const;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(x));
}

/** Nearest country capital for displaying a default location from coordinates. */
export function findNearestCountry(coords: GeoCoords): Country {
  let nearest = COUNTRIES[0];
  let bestDistance = Infinity;
  for (const country of COUNTRIES) {
    const distance = haversineKm(coords, { lat: country.lat, lng: country.lng });
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = country;
    }
  }
  return nearest;
}

export function coordsDisplayBilingual(coords: GeoCoords): Bilingual {
  const label = `${formatCoord(coords.lat)}, ${formatCoord(coords.lng)}`;
  return bi(label, label);
}

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
  activeCoords: GeoCoords | null = null,
): Bilingual {
  if (source === "manual") {
    if (countryName) return countryName;
    if (activeCoords) return coordsDisplayBilingual(activeCoords);
  }
  if (geoPending) {
    return LOCATION_DISPLAY.detecting;
  }
  if (source === "geolocation" && activeCoords) {
    return countryBilingual(findNearestCountry(activeCoords));
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
