import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  countryBilingual,
  getLocationCountry,
  isValidCoords,
  locationDisplayLabel,
  type GeoCoords,
  type LocationSource,
} from "../utils/location";
import {
  formatPlaceLabel,
  placeNameBilingual,
  reverseGeocodeCoordinates,
} from "../utils/geocode";
import type { Bilingual } from "../utils/bilingual";

const GEO_TIMEOUT_MS = 15_000;

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface ApplyLocationInput {
  countryId?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeName?: string | null;
}

export interface LocationContextValue {
  /** Coords used for sunrise / jamam calculations (applied on load or submit). */
  coords: GeoCoords | null;
  geoCoords: GeoCoords | null;
  manualCoords: GeoCoords | null;
  source: LocationSource;
  countryId: string | null;
  countryName: Bilingual | null;
  placeName: Bilingual | null;
  locationDisplay: Bilingual;
  geoPermission: GeoPermissionState;
  geoPending: boolean;
  applyLocation: (input: ApplyLocationInput) => void;
  requestGeolocation: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(null);
  const [manualCoords, setManualCoords] = useState<GeoCoords | null>(null);
  const [source, setSource] = useState<LocationSource>("fallback");
  const [countryId, setCountryIdState] = useState<string | null>(null);
  const [resolvedPlaceName, setResolvedPlaceName] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(true);
  const [geoPermission, setGeoPermission] = useState<GeoPermissionState>(() =>
    typeof navigator !== "undefined" && "geolocation" in navigator ? "prompt" : "unsupported",
  );

  const syncPermissionState = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoPermission("unsupported");
      return;
    }

    try {
      const permissions = navigator.permissions;
      if (!permissions?.query) return;
      const status = await permissions.query({ name: "geolocation" as PermissionName });
      setGeoPermission(status.state as GeoPermissionState);
      status.onchange = () => {
        setGeoPermission(status.state as GeoPermissionState);
      };
    } catch {
      // Permissions API may be unavailable; keep last known state.
    }
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoCoords(null);
      setCoords(null);
      setSource("fallback");
      setCountryIdState(null);
      setManualCoords(null);
      setResolvedPlaceName(null);
      setGeoPending(false);
      setGeoPermission("unsupported");
      return;
    }

    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGeoCoords(nextCoords);
        setCoords(nextCoords);
        setSource("geolocation");
        setCountryIdState(null);
        setManualCoords(null);
        setResolvedPlaceName(null);
        setGeoPermission("granted");

        const placeName = await reverseGeocodeCoordinates(nextCoords.lat, nextCoords.lng);
        setResolvedPlaceName(formatPlaceLabel(placeName));
        setGeoPending(false);
        void syncPermissionState();
      },
      (error) => {
        setGeoCoords(null);
        setCoords(null);
        setSource("fallback");
        setCountryIdState(null);
        setManualCoords(null);
        setResolvedPlaceName(null);
        setGeoPending(false);
        setGeoPermission(error.code === error.PERMISSION_DENIED ? "denied" : "prompt");
        void syncPermissionState();
      },
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    );
  }, [syncPermissionState]);

  useEffect(() => {
    void syncPermissionState();
    requestGeolocation();
  }, [requestGeolocation, syncPermissionState]);

  const applyLocation = useCallback(({
    countryId: nextCountryId = null,
    lat = null,
    lng = null,
    placeName: nextPlaceName = null,
  }: ApplyLocationInput) => {
    if (lat !== null && lng !== null && isValidCoords(lat, lng)) {
      const nextCoords = { lat, lng };
      setCoords(nextCoords);
      setManualCoords(nextCoords);
      setSource("manual");
      setCountryIdState(nextCountryId);
      setResolvedPlaceName(nextPlaceName?.trim() || null);
      setGeoPending(false);
      return;
    }

    setCoords(null);
    setManualCoords(null);
    setSource("fallback");
    setCountryIdState(null);
    setResolvedPlaceName(null);
    setGeoPending(false);
  }, []);

  const countryName = useMemo(
    () => (countryId ? countryBilingual(getLocationCountry(countryId)) : null),
    [countryId],
  );

  const placeName = useMemo(
    () => (resolvedPlaceName ? placeNameBilingual(resolvedPlaceName) : null),
    [resolvedPlaceName],
  );

  const locationDisplay = useMemo(
    () => locationDisplayLabel(source, countryName, geoPending, coords, placeName),
    [source, countryName, geoPending, coords, placeName],
  );

  const value = useMemo(
    () => ({
      coords,
      geoCoords,
      manualCoords,
      source,
      countryId,
      countryName,
      placeName,
      locationDisplay,
      geoPermission,
      geoPending,
      applyLocation,
      requestGeolocation,
    }),
    [
      coords,
      geoCoords,
      manualCoords,
      source,
      countryId,
      countryName,
      placeName,
      locationDisplay,
      geoPermission,
      geoPending,
      applyLocation,
      requestGeolocation,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
