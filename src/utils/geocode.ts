import { bi, type Bilingual } from "./bilingual";

export type PlaceCoords = {
  placeName: string;
  latitude: number;
  longitude: number;
};

export type PlaceSuggestion = PlaceCoords & {
  id: string;
};

export const DEFAULT_PLACE: PlaceCoords = {
  placeName: "Chennai, Tamil Nadu, India",
  latitude: 13.0827,
  longitude: 80.2707,
};

export const PLACE_PRESETS: PlaceCoords[] = [
  DEFAULT_PLACE,
  { placeName: "Coimbatore, Tamil Nadu, India", latitude: 11.0168, longitude: 76.9558 },
  { placeName: "Madurai, Tamil Nadu, India", latitude: 9.9252, longitude: 78.1198 },
  { placeName: "Trichy, Tamil Nadu, India", latitude: 10.7905, longitude: 78.7047 },
  { placeName: "Salem, Tamil Nadu, India", latitude: 11.6643, longitude: 78.146 },
  { placeName: "Tirunelveli, Tamil Nadu, India", latitude: 8.7139, longitude: 77.7567 },
  { placeName: "Erode, Tamil Nadu, India", latitude: 11.341, longitude: 77.7172 },
  { placeName: "Bengaluru, Karnataka, India", latitude: 12.9716, longitude: 77.5946 },
  { placeName: "Hyderabad, Telangana, India", latitude: 17.385, longitude: 78.4867 },
  { placeName: "Mumbai, Maharashtra, India", latitude: 19.076, longitude: 72.8777 },
  { placeName: "Pune, Maharashtra, India", latitude: 18.5204, longitude: 73.8567 },
  { placeName: "Delhi, India", latitude: 28.7041, longitude: 77.1025 },
  { placeName: "Kolkata, West Bengal, India", latitude: 22.5726, longitude: 88.3639 },
  { placeName: "Ahmedabad, Gujarat, India", latitude: 23.0225, longitude: 72.5714 },
  { placeName: "Kochi, Kerala, India", latitude: 9.9312, longitude: 76.2673 },
  { placeName: "Durban, KwaZulu-Natal, South Africa", latitude: -29.8587, longitude: 31.0218 },
  { placeName: "Colombo, Western Province, Sri Lanka", latitude: 6.9271, longitude: 79.8612 },
  { placeName: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { placeName: "London, England, United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { placeName: "New York, New York, United States", latitude: 40.7128, longitude: -74.006 },
  { placeName: "Dubai, United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
];

const PHOTON_SEARCH_URL = "https://photon.komoot.io/api/";
const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse";

type PhotonProperties = {
  osm_id?: number;
  osm_type?: string;
  type?: string;
  name?: string;
  city?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  locality?: string;
};

type PhotonFeature = {
  properties: PhotonProperties;
  geometry: { coordinates: [number, number] };
};

const PLACE_TYPE_RANK: Record<string, number> = {
  city: 0,
  town: 1,
  village: 2,
  district: 3,
  county: 4,
  state: 5,
  country: 6,
  locality: 7,
  house: 8,
  other: 9,
};

export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
}

export function toCoordinateInputValues(
  latitude: number,
  longitude: number,
): { latitude: string; longitude: string } {
  return {
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
  };
}

function parseCoordinatePart(value: string, kind: "lat" | "lon"): number | null {
  const trimmed = value.trim().replace(/°/g, "");
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*([NnSsEeWw])?$/);
  if (!match) return null;

  let num = parseFloat(match[1]);
  const dir = match[2]?.toUpperCase();
  if (dir === "S" || dir === "W") num = -Math.abs(num);
  else if (dir === "N" || dir === "E") num = Math.abs(num);

  if (!Number.isFinite(num)) return null;
  if (kind === "lat" && Math.abs(num) > 90) return null;
  if (kind === "lon" && Math.abs(num) > 180) return null;
  return num;
}

export function parseCoordinateInputs(
  latitudeValue: string,
  longitudeValue: string,
): { latitude: number; longitude: number } | null {
  const latitude = parseCoordinatePart(latitudeValue, "lat");
  const longitude = parseCoordinatePart(longitudeValue, "lon");
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

/** Parse formatted coordinate text like `13.0827° N, 80.2707° E`. */
export function parseCoordinates(input: string): {
  latitude: number;
  longitude: number;
} | null {
  const parts = input.split(/[,，]/).map((part) => part.trim());
  if (parts.length !== 2) return null;
  return parseCoordinateInputs(parts[0], parts[1]);
}

export function isValidCoordinateInputs(
  latitudeValue: string,
  longitudeValue: string,
): boolean {
  return parseCoordinateInputs(latitudeValue, longitudeValue) !== null;
}

/** Build a concise City, State, Country label from Photon/OSM properties. */
export function formatPlaceFromProperties(props: PhotonProperties): string {
  const primary =
    props.name?.trim() ||
    props.city?.trim() ||
    props.district?.trim() ||
    props.county?.trim() ||
    "";
  if (!primary) return "";

  const parts: string[] = [];
  const seen = new Set<string>();
  const add = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(trimmed);
  };

  add(primary);
  add(props.state);
  add(props.country);
  return parts.join(", ");
}

/** Trim verbose geocoded names to city/district, state, and country. */
export function formatPlaceLabel(placeName: string): string {
  const trimmed = placeName?.trim();
  if (!trimmed) return "—";

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d{5,7}$/.test(part))
    .filter((part) => !/^ward\s+\d+/i.test(part))
    .map((part) =>
      part
        .replace(/^Greater\s+/i, "")
        .replace(/\s+District$/i, "")
        .trim(),
    )
    .filter(Boolean);

  if (parts.length === 0) return trimmed;
  if (parts.length <= 3) return parts.join(", ");

  const country = parts[parts.length - 1];
  const state = parts[parts.length - 2];
  const city = parts[parts.length - 3];
  return [city, state, country].join(", ");
}

export function placeNameBilingual(placeName: string): Bilingual {
  const label = formatPlaceLabel(placeName);
  return bi(label, label);
}

function matchPreset(query: string): PlaceCoords | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return (
    PLACE_PRESETS.find((preset) => {
      const city = preset.placeName.split(",")[0].trim().toLowerCase();
      return (
        preset.placeName.toLowerCase() === normalized ||
        preset.placeName.toLowerCase().startsWith(normalized) ||
        city === normalized ||
        city.startsWith(normalized)
      );
    }) ?? null
  );
}

function presetSuggestions(query: string): PlaceSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return PLACE_PRESETS.filter((preset) => {
    const city = preset.placeName.split(",")[0].trim().toLowerCase();
    return (
      preset.placeName.toLowerCase().includes(normalized) ||
      city.startsWith(normalized) ||
      normalized.startsWith(city)
    );
  }).map((preset) => ({
    ...preset,
    id: `preset:${preset.placeName}`,
  }));
}

function rankPhotonFeature(feature: PhotonFeature, query: string): number {
  const props = feature.properties;
  const typeRank = PLACE_TYPE_RANK[props.type ?? "other"] ?? 9;
  const name = (props.name || props.city || "").toLowerCase();
  const normalized = query.trim().toLowerCase();
  let nameRank = 2;
  if (name === normalized) nameRank = 0;
  else if (name.startsWith(normalized)) nameRank = 1;
  return typeRank * 10 + nameRank;
}

function photonFeatureToSuggestion(feature: PhotonFeature): PlaceSuggestion | null {
  const [longitude, latitude] = feature.geometry.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const placeName = formatPlaceFromProperties(feature.properties);
  if (!placeName) return null;

  const props = feature.properties;
  const id = `${props.osm_type ?? "x"}:${props.osm_id ?? placeName}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  return { id, placeName, latitude, longitude };
}

function dedupeSuggestions(suggestions: PlaceSuggestion[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const result: PlaceSuggestion[] = [];
  for (const suggestion of suggestions) {
    const key = `${suggestion.placeName.toLowerCase()}|${suggestion.latitude.toFixed(3)}|${suggestion.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
  }
  return result;
}

async function fetchPhotonFeatures(
  url: URL,
): Promise<PhotonFeature[]> {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];

  const data = (await response.json()) as { features?: PhotonFeature[] };
  return data.features ?? [];
}

/** Debounced autocomplete search — Photon (OSM) with local preset fallback. */
export async function searchPlaces(
  query: string,
  limit = 8,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return presetSuggestions(trimmed).slice(0, limit);

  const presetMatches = presetSuggestions(trimmed);
  try {
    const url = new URL(PHOTON_SEARCH_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("limit", String(Math.max(limit, 10)));
    url.searchParams.set("lang", "en");

    const features = await fetchPhotonFeatures(url);
    const ranked = features
      .slice()
      .sort((a, b) => rankPhotonFeature(a, trimmed) - rankPhotonFeature(b, trimmed))
      .map(photonFeatureToSuggestion)
      .filter((item): item is PlaceSuggestion => item !== null);

    return dedupeSuggestions([...presetMatches, ...ranked]).slice(0, limit);
  } catch {
    return presetMatches.slice(0, limit);
  }
}

/** Resolve a typed place name to coordinates (best match). */
export async function geocodePlace(query: string): Promise<PlaceCoords | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const preset = matchPreset(trimmed);
  if (preset) return { ...preset };

  const suggestions = await searchPlaces(trimmed, 1);
  if (suggestions.length) {
    const best = suggestions[0];
    return {
      placeName: best.placeName,
      latitude: best.latitude,
      longitude: best.longitude,
    };
  }

  return preset;
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const url = new URL(PHOTON_REVERSE_URL);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("lang", "en");

    const features = await fetchPhotonFeatures(url);
    if (features.length) {
      const label = formatPlaceFromProperties(features[0].properties);
      if (label) return label;
    }
  } catch {
    // fall through
  }

  return formatCoordinates(latitude, longitude);
}

export function getBrowserGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60_000,
    });
  });
}

export async function resolveCurrentLocationPlace(): Promise<PlaceCoords> {
  const position = await getBrowserGeolocation();
  const { latitude, longitude } = position.coords;
  const placeName = await reverseGeocodeCoordinates(latitude, longitude);
  return { placeName, latitude, longitude };
}

/** Reverse-geocode lat/lng and return a labeled place (pancha-patchi helper). */
export async function resolvePlaceFromCoordinates(
  lat: number,
  lng: number,
): Promise<{ placeName: string; lat: number; lng: number }> {
  const placeName = await reverseGeocodeCoordinates(lat, lng);
  return {
    placeName: formatPlaceLabel(placeName),
    lat,
    lng,
  };
}
