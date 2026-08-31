import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  countryBilingual,
  getLocationCountry,
  isValidCoords,
  locationDisplayLabel,
  type GeoCoords,
  type LocationSource,
} from "../utils/location";
import type { Bilingual } from "../utils/bilingual";

const GEO_TIMEOUT_MS = 10_000;

export interface ApplyLocationInput {
  countryId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface LocationContextValue {
  /** Coords used for sunrise / jamam calculations (applied on load or submit). */
  coords: GeoCoords | null;
  geoCoords: GeoCoords | null;
  manualCoords: GeoCoords | null;
  source: LocationSource;
  countryId: string | null;
  countryName: Bilingual | null;
  locationDisplay: Bilingual;
  applyLocation: (input: ApplyLocationInput) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(null);
  const [manualCoords, setManualCoords] = useState<GeoCoords | null>(null);
  const [source, setSource] = useState<LocationSource>("fallback");
  const [countryId, setCountryIdState] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(true);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoCoords(null);
      setCoords(null);
      setSource("fallback");
      setCountryIdState(null);
      setManualCoords(null);
      setGeoPending(false);
      return;
    }

    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGeoCoords(nextCoords);
        setCoords(nextCoords);
        setSource("geolocation");
        setCountryIdState(null);
        setManualCoords(null);
        setGeoPending(false);
      },
      () => {
        setGeoCoords(null);
        setCoords(null);
        setSource("fallback");
        setCountryIdState(null);
        setManualCoords(null);
        setGeoPending(false);
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  const applyLocation = useCallback(({ countryId: nextCountryId = null, lat = null, lng = null }: ApplyLocationInput) => {
    if (lat !== null && lng !== null && isValidCoords(lat, lng)) {
      const nextCoords = { lat, lng };
      setCoords(nextCoords);
      setManualCoords(nextCoords);
      setSource("manual");
      setCountryIdState(nextCountryId);
      setGeoPending(false);
      return;
    }

    setCoords(null);
    setManualCoords(null);
    setSource("fallback");
    setCountryIdState(null);
    setGeoPending(false);
  }, []);

  const countryName = useMemo(
    () => (countryId ? countryBilingual(getLocationCountry(countryId)) : null),
    [countryId],
  );

  const locationDisplay = useMemo(
    () => locationDisplayLabel(source, countryName, geoPending, coords),
    [source, countryName, geoPending, coords],
  );

  const value = useMemo(
    () => ({
      coords,
      geoCoords,
      manualCoords,
      source,
      countryId,
      countryName,
      locationDisplay,
      applyLocation,
    }),
    [coords, geoCoords, manualCoords, source, countryId, countryName, locationDisplay, applyLocation],
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
