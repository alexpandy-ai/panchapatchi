import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PLACE,
  geocodePlace,
  parseCoordinateInputs,
  resolveCurrentLocationPlace,
  searchPlaces,
  toCoordinateInputValues,
  type PlaceCoords,
  type PlaceSuggestion,
} from "../utils/geocode";

export function usePlaceGeocode(
  initialPlace: PlaceCoords = DEFAULT_PLACE,
  onPlaceCommit?: (place: PlaceCoords) => void,
) {
  const [placeInput, setPlaceInput] = useState(initialPlace.placeName);
  const [place, setPlace] = useState<PlaceCoords>(initialPlace);
  const [latitudeInput, setLatitudeInput] = useState(() =>
    toCoordinateInputValues(initialPlace.latitude, initialPlace.longitude).latitude,
  );
  const [longitudeInput, setLongitudeInput] = useState(() =>
    toCoordinateInputValues(initialPlace.latitude, initialPlace.longitude).longitude,
  );
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);
  const skipNextSearchRef = useRef(false);

  const syncCoordinateInputs = useCallback((coords: PlaceCoords) => {
    const values = toCoordinateInputValues(coords.latitude, coords.longitude);
    setLatitudeInput(values.latitude);
    setLongitudeInput(values.longitude);
  }, []);

  const applyResolvedPlace = useCallback(
    (resolved: PlaceCoords) => {
      setPlace(resolved);
      setPlaceInput(resolved.placeName);
      syncCoordinateInputs(resolved);
    },
    [syncCoordinateInputs],
  );

  const clearPlaceSuggestions = useCallback(() => {
    setPlaceSuggestions([]);
    setActiveSuggestionIndex(-1);
  }, []);

  const selectPlaceSuggestion = useCallback(
    (suggestion: PlaceSuggestion) => {
      skipNextSearchRef.current = true;
      applyResolvedPlace(suggestion);
      clearPlaceSuggestions();
      onPlaceCommit?.(suggestion);
    },
    [applyResolvedPlace, clearPlaceSuggestions, onPlaceCommit],
  );

  const lookupPlaceCoordinates = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return null;

      setIsGeocoding(true);
      try {
        const resolved = await geocodePlace(trimmed);
        if (resolved) {
          applyResolvedPlace(resolved);
          return resolved;
        }
        return null;
      } finally {
        setIsGeocoding(false);
      }
    },
    [applyResolvedPlace],
  );

  const schedulePlaceSearch = useCallback((query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPlaceSuggestions(trimmed ? [] : []);
      setActiveSuggestionIndex(-1);
      setIsSearchingPlaces(false);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      const requestId = ++searchRequestRef.current;
      setIsSearchingPlaces(true);
      void searchPlaces(trimmed)
        .then((suggestions) => {
          if (requestId !== searchRequestRef.current) return;
          setPlaceSuggestions(suggestions);
          setActiveSuggestionIndex(suggestions.length ? 0 : -1);
        })
        .finally(() => {
          if (requestId === searchRequestRef.current) {
            setIsSearchingPlaces(false);
          }
        });
    }, 280);
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handlePlaceInputChange = (value: string) => {
    setPlaceInput(value);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    schedulePlaceSearch(value);
  };

  const handlePlaceBlur = () => {
    window.setTimeout(() => clearPlaceSuggestions(), 150);
  };

  const handlePlaceSearch = async () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (placeSuggestions.length) {
      selectPlaceSuggestion(placeSuggestions[Math.max(activeSuggestionIndex, 0)]);
      return;
    }
    const resolved = await lookupPlaceCoordinates(placeInput);
    if (resolved) onPlaceCommit?.(resolved);
  };

  const handlePlaceKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!placeSuggestions.length) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handlePlaceSearch();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) =>
        index < placeSuggestions.length - 1 ? index + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) =>
        index > 0 ? index - 1 : placeSuggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected =
        placeSuggestions[Math.max(activeSuggestionIndex, 0)] ?? placeSuggestions[0];
      if (selected) selectPlaceSuggestion(selected);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearPlaceSuggestions();
    }
  };

  const commitCoordinateInputs = useCallback(() => {
    const parsed = parseCoordinateInputs(latitudeInput, longitudeInput);
    if (!parsed) {
      syncCoordinateInputs(place);
      return;
    }

    const nextPlace = {
      ...place,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
    setPlace(nextPlace);
    syncCoordinateInputs(nextPlace);
  }, [latitudeInput, longitudeInput, place, syncCoordinateInputs]);

  const applyPlaceFromForm = useCallback(async (): Promise<PlaceCoords> => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    clearPlaceSuggestions();

    let latitude = place.latitude;
    let longitude = place.longitude;
    let placeName = placeInput.trim() || place.placeName;

    if (placeInput.trim()) {
      setIsGeocoding(true);
      try {
        const resolved = await geocodePlace(placeInput.trim());
        if (resolved) {
          latitude = resolved.latitude;
          longitude = resolved.longitude;
          placeName = resolved.placeName;
        }
      } finally {
        setIsGeocoding(false);
      }
    }

    const manual = parseCoordinateInputs(latitudeInput, longitudeInput);
    if (manual) {
      latitude = manual.latitude;
      longitude = manual.longitude;
    }

    const nextPlace = { placeName, latitude, longitude };
    setPlace(nextPlace);
    setPlaceInput(placeName);
    syncCoordinateInputs(nextPlace);
    onPlaceCommit?.(nextPlace);
    return nextPlace;
  }, [
    clearPlaceSuggestions,
    latitudeInput,
    longitudeInput,
    onPlaceCommit,
    place,
    placeInput,
    syncCoordinateInputs,
  ]);

  const handleLatitudeInputChange = (value: string) => {
    setLatitudeInput(value.slice(0, 12));
  };

  const handleLongitudeInputChange = (value: string) => {
    setLongitudeInput(value.slice(0, 12));
  };

  const handleCoordinateBlur = () => {
    commitCoordinateInputs();
  };

  const applyCurrentLocation = useCallback(async (): Promise<PlaceCoords | null> => {
    setIsLocating(true);
    try {
      const resolved = await resolveCurrentLocationPlace();
      skipNextSearchRef.current = true;
      applyResolvedPlace(resolved);
      clearPlaceSuggestions();
      return resolved;
    } catch {
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [applyResolvedPlace, clearPlaceSuggestions]);

  return {
    placeInput,
    place,
    latitudeInput,
    longitudeInput,
    placeSuggestions,
    activeSuggestionIndex,
    isGeocoding,
    isSearchingPlaces,
    isLocating,
    setPlaceInput,
    handlePlaceInputChange,
    handlePlaceBlur,
    handlePlaceSearch,
    handlePlaceKeyDown,
    selectPlaceSuggestion,
    clearPlaceSuggestions,
    applyPlaceFromForm,
    applyCurrentLocation,
    handleLatitudeInputChange,
    handleLongitudeInputChange,
    handleCoordinateBlur,
    commitCoordinateInputs,
  };
}
