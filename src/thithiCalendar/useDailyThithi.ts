import { useEffect, useMemo, useState } from "react";
import { useLocation } from "../context/LocationContext";
import type { GeoCoords } from "../utils/location";
import { placeKey, type ThithiPlace } from "./calendar";
import { calculateDailyThithi, peekDailyThithi, placeForCoords, type DailyThithi } from "./dailyThithi";

export type DailyThithiState = { status: "locating" } | DailyThithi;

export interface UseDailyThithi {
  place: ThithiPlace;
  locating: boolean;
  /** `null` when disabled. */
  daily: DailyThithiState | null;
}

/**
 * Shared daily thithi for the selected date/time and the applied location
 * (or `coordsOverride`, e.g. the coordinates submitted on Find Patchi).
 * Cached years resolve synchronously; an uncached year is computed in a timeout so renders stay cheap.
 */
export function useDailyThithi(
  selectedDateTime: Date,
  enabled = true,
  coordsOverride?: GeoCoords | null,
): UseDailyThithi {
  const location = useLocation();
  const coords = coordsOverride !== undefined ? coordsOverride : location.coords;
  const lat = coords?.lat ?? null;
  const lng = coords?.lng ?? null;
  const place = useMemo(
    () => placeForCoords(lat !== null && lng !== null ? { lat, lng } : null),
    [lat, lng],
  );
  const locating = coordsOverride === undefined && location.geoPending && coords === null;
  const time = selectedDateTime.getTime();
  const key = `${placeKey(place)}@${time}`;
  const [computed, setComputed] = useState<{ key: string; result: DailyThithi } | null>(null);

  const daily = useMemo<DailyThithiState | null>(() => {
    if (!enabled) return null;
    if (locating) return { status: "locating" };
    if (computed?.key === key) return computed.result;
    return peekDailyThithi(place, new Date(time));
  }, [enabled, locating, computed, key, place, time]);

  const pending = daily?.status === "pending";
  useEffect(() => {
    if (!pending) return;
    let cancel = false;
    const handle = window.setTimeout(() => {
      const result = calculateDailyThithi(place, new Date(time));
      if (!cancel) setComputed({ key, result });
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [pending, key, place, time]);

  return { place, locating, daily };
}
