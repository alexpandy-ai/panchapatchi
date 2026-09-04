import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useLocation } from "../context/LocationContext";
import { useLanguage } from "../context/LanguageContext";

import { BilingualText } from "./BilingualText";

import { bi, pickBilingual, UI, WEEKDAY_EN } from "../utils/bilingual";
import { TAMIL_WEEKDAYS } from "../utils/dayGroup";
import { formatTime, getDayCycleBounds } from "../utils/jamam";

import { COUNTRIES } from "../data/countries";

import {
  coordsToInputValues,
  countryOptionLabel,
  formatCoord,
  isValidCoords,
  parseCoordInput,
  resolveCountryInput,
} from "../utils/location";
import { formatPlaceLabel, geocodePlace, searchPlaces, type PlaceSuggestion } from "../utils/geocode";



interface DateTimeCardProps {

  value: Date;

  onChange: (next: Date) => void;

}



function toDateInputValue(date: Date): string {

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}



function toTimeInputValue(date: Date): string {

  const hours = String(date.getHours()).padStart(2, "0");

  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;

}



function applyDatePart(current: Date, dateValue: string): Date {

  const [year, month, day] = dateValue.split("-").map(Number);

  const next = new Date(current);

  next.setFullYear(year, month - 1, day);

  return next;

}



function applyTimePart(current: Date, timeValue: string): Date {

  const [hours, minutes] = timeValue.split(":").map(Number);

  const next = new Date(current);

  next.setHours(hours, minutes, 0, 0);

  return next;

}



function previewCoordsForSource(

  source: "geolocation" | "manual" | "fallback",

  geoCoords: { lat: number; lng: number } | null,

  manualCoords: { lat: number; lng: number } | null,

  appliedCoords: { lat: number; lng: number } | null,

) {

  if (source === "geolocation" && geoCoords) return coordsToInputValues(geoCoords);

  if (source === "manual" && manualCoords) return coordsToInputValues(manualCoords);

  if (appliedCoords) return coordsToInputValues(appliedCoords);

  return { lat: "", lng: "" };

}



export function DateTimeCard({ value, onChange }: DateTimeCardProps) {

  const { coords, geoCoords, manualCoords, source, locationDisplay, applyLocation } = useLocation();
  const { language } = useLanguage();

  const listId = useId();

  const [dateInput, setDateInput] = useState(() => toDateInputValue(value));
  const [timeInput, setTimeInput] = useState(() => toTimeInputValue(value));

  const previewWeekdayIndex = useMemo(
    () => applyDatePart(new Date(value), dateInput).getDay(),
    [value, dateInput],
  );
  const weekdayBi = bi(
    TAMIL_WEEKDAYS[previewWeekdayIndex] ?? "",
    WEEKDAY_EN[previewWeekdayIndex] ?? "",
  );

  const [locationInput, setLocationInput] = useState(() => pickBilingual(locationDisplay, "ta"));
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const [latInput, setLatInput] = useState("");

  const [lngInput, setLngInput] = useState("");

  const draftDirtyRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);
  const skipNextSearchRef = useRef(false);

  const clearPlaceSuggestions = useCallback(() => {
    setPlaceSuggestions([]);
    setActiveSuggestionIndex(-1);
  }, []);

  const schedulePlaceSearch = useCallback((query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      clearPlaceSuggestions();
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
  }, [clearPlaceSuggestions]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const selectPlaceSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    skipNextSearchRef.current = true;
    setLocationInput(formatPlaceLabel(suggestion.placeName));
    setLatInput(formatCoord(suggestion.latitude));
    setLngInput(formatCoord(suggestion.longitude));
    draftDirtyRef.current = true;
    clearPlaceSuggestions();
  }, [clearPlaceSuggestions]);



  useEffect(() => {

    if (draftDirtyRef.current) return;

    setLocationInput(pickBilingual(locationDisplay, language));

  }, [locationDisplay, language]);



  useEffect(() => {

    if (draftDirtyRef.current) return;

    setDateInput(toDateInputValue(value));

    setTimeInput(toTimeInputValue(value));

  }, [value]);



  useEffect(() => {

    if (draftDirtyRef.current) return;

    const preview = previewCoordsForSource(source, geoCoords, manualCoords, coords);

    setLatInput(preview.lat);

    setLngInput(preview.lng);

  }, [source, geoCoords, manualCoords, coords]);



  const previewCountryCoords = async (nextValue: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const resolved = resolveCountryInput(nextValue);
    if (resolved) {
      setLocationInput(countryOptionLabel(resolved));
      setLatInput(formatCoord(resolved.lat));
      setLngInput(formatCoord(resolved.lng));
      draftDirtyRef.current = true;
      clearPlaceSuggestions();
      return;
    }

    if (placeSuggestions.length) {
      selectPlaceSuggestion(placeSuggestions[Math.max(activeSuggestionIndex, 0)]);
      return;
    }

    const geocoded = await geocodePlace(nextValue);
    if (!geocoded) return;

    const placeName = formatPlaceLabel(geocoded.placeName);
    setLocationInput(placeName);
    setLatInput(formatCoord(geocoded.latitude));
    setLngInput(formatCoord(geocoded.longitude));
    draftDirtyRef.current = true;
    clearPlaceSuggestions();
  };

  const handleLocationBlur = () => {
    window.setTimeout(() => clearPlaceSuggestions(), 150);
  };

  const handleLocationKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (placeSuggestions.length) {
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
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void previewCountryCoords(locationInput);
    }
  };



  const handleSubmit = async () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    clearPlaceSuggestions();

    const nextDateTime = applyTimePart(
      applyDatePart(new Date(value), dateInput),
      timeInput,
    );
    onChange(nextDateTime);

    const resolved = resolveCountryInput(locationInput);
    let lat = parseCoordInput(latInput);
    let lng = parseCoordInput(lngInput);
    let placeName: string | null = null;
    let countryId: string | null = null;

    if (resolved) {
      countryId = resolved.id;
      lat = resolved.lat;
      lng = resolved.lng;
      placeName = countryOptionLabel(resolved);
    } else {
      const trimmedLocation = locationInput.trim();
      if (trimmedLocation) {
        const geocoded = await geocodePlace(trimmedLocation);
        if (geocoded) {
          placeName = formatPlaceLabel(geocoded.placeName);
          const manualLat = parseCoordInput(latInput);
          const manualLng = parseCoordInput(lngInput);
          if (
            manualLat !== null &&
            manualLng !== null &&
            isValidCoords(manualLat, manualLng)
          ) {
            lat = manualLat;
            lng = manualLng;
          } else {
            lat = geocoded.latitude;
            lng = geocoded.longitude;
          }
        } else {
          placeName = trimmedLocation;
        }
      }
    }

    applyLocation({
      countryId,
      lat,
      lng,
      placeName,
    });

    if (lat !== null && lng !== null && isValidCoords(lat, lng)) {
      setLatInput(formatCoord(lat));
      setLngInput(formatCoord(lng));
    }
    if (placeName) {
      setLocationInput(placeName);
    }

    draftDirtyRef.current = false;
  };



  const submitLabel = source === "manual" ? UI.updateLocation : UI.submitLocation;

  const { sunrise } = getDayCycleBounds(value, coords);

  return (

    <section className="datetime-card" aria-label={pickBilingual(UI.dateTime, language)}>

      <div className="datetime-card__row">

        <label className="datetime-field">

          <span className="datetime-field__label">

            <BilingualText text={UI.date} />

          </span>

          <div className="datetime-field__date-row">

            <span className="datetime-card__weekday" aria-hidden="true">

              <BilingualText text={weekdayBi} />

            </span>

            <input

              type="date"

              className="datetime-field__input"

              value={dateInput}

              onChange={(event) => {
                draftDirtyRef.current = true;
                setDateInput(event.target.value);
              }}

            />

          </div>

        </label>



        <label className="datetime-field">

          <span className="datetime-field__label">

            <BilingualText text={UI.time} />

          </span>

          <input

            type="time"

            className="datetime-field__input"

            value={timeInput}

            onChange={(event) => {
              draftDirtyRef.current = true;
              setTimeInput(event.target.value);
            }}

          />

        </label>



        <label className="datetime-field datetime-field--location">

          <span className="datetime-field__label">

            <BilingualText text={UI.location} />

          </span>

          <div className="datetime-field__location-autocomplete">

            <input

              type="text"

              className="datetime-field__input datetime-field__combobox"

              list={listId}

              value={locationInput}

              onChange={(event) => {

                draftDirtyRef.current = true;

                const nextValue = event.target.value;

                setLocationInput(nextValue);

                if (skipNextSearchRef.current) {

                  skipNextSearchRef.current = false;

                  return;

                }

                schedulePlaceSearch(nextValue);

              }}

              onBlur={() => {
                handleLocationBlur();
                void previewCountryCoords(locationInput);
              }}

              onKeyDown={handleLocationKeyDown}

              placeholder={pickBilingual(UI.location, language)}

              aria-label={pickBilingual(UI.location, language)}

              autoComplete="off"

              role="combobox"

              aria-expanded={placeSuggestions.length > 0}

              aria-controls="datetimeLocationSuggestions"

              aria-autocomplete="list"

            />

            {placeSuggestions.length > 0 && (

              <ul

                id="datetimeLocationSuggestions"

                className="datetime-field__place-suggestions"

                role="listbox"

              >

                {placeSuggestions.map((suggestion, index) => (

                  <li key={suggestion.id} role="option" aria-selected={index === activeSuggestionIndex}>

                    <button

                      type="button"

                      className={`datetime-field__place-suggestion${index === activeSuggestionIndex ? " is-active" : ""}`}

                      onMouseDown={(event) => event.preventDefault()}

                      onClick={() => selectPlaceSuggestion(suggestion)}

                    >

                      {formatPlaceLabel(suggestion.placeName)}

                    </button>

                  </li>

                ))}

              </ul>

            )}

            {isSearchingPlaces && placeSuggestions.length === 0 && locationInput.trim().length >= 2 && (

              <div

                className="datetime-field__place-suggestions datetime-field__place-suggestions--loading"

                aria-live="polite"

              >

                <BilingualText text={UI.searchingPlaces} />

              </div>

            )}

          </div>

          <datalist id={listId}>

            {COUNTRIES.map((country) => (

              <option key={country.id} value={countryOptionLabel(country)} />

            ))}

          </datalist>

        </label>



        <div className="datetime-field datetime-field--sunrise">

          <span className="datetime-field__label">

            <BilingualText text={UI.sunrise} />

          </span>

          <span className="datetime-field__sunrise-value" aria-live="polite">

            {formatTime(sunrise)}

          </span>

        </div>



        <div className="datetime-field datetime-field--coords">

          <div className="datetime-field__coords-row">

            <label className="datetime-field__coord">

              <span className="datetime-field__coord-label">

                <BilingualText text={UI.latitude} />

              </span>

              <input

                type="text"

                inputMode="decimal"

                className="datetime-field__input datetime-field__coord-input"

                value={latInput}

                onChange={(event) => {

                  draftDirtyRef.current = true;

                  setLatInput(event.target.value);

                }}

                placeholder="13.08"

                aria-label={pickBilingual(UI.latitude, language)}

                autoComplete="off"

              />

            </label>

            <label className="datetime-field__coord">

              <span className="datetime-field__coord-label">

                <BilingualText text={UI.longitude} />

              </span>

              <input

                type="text"

                inputMode="decimal"

                className="datetime-field__input datetime-field__coord-input"

                value={lngInput}

                onChange={(event) => {

                  draftDirtyRef.current = true;

                  setLngInput(event.target.value);

                }}

                placeholder="80.27"

                aria-label={pickBilingual(UI.longitude, language)}

                autoComplete="off"

              />

            </label>

          </div>

        </div>



        <button

          type="button"

          className="datetime-card__submit"

          onClick={() => {
            void handleSubmit();
          }}

          aria-label={pickBilingual(submitLabel, language)}

        >

          <BilingualText text={submitLabel} />

        </button>

      </div>

    </section>

  );

}

