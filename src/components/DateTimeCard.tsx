import { useEffect, useId, useRef, useState } from "react";

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

  parseCoordInput,

  resolveCountryInput,

} from "../utils/location";



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

  const weekdayIndex = value.getDay();
  const weekdayBi = bi(TAMIL_WEEKDAYS[weekdayIndex] ?? "", WEEKDAY_EN[weekdayIndex] ?? "");

  const [locationInput, setLocationInput] = useState(() => pickBilingual(locationDisplay, "ta"));

  const [latInput, setLatInput] = useState("");

  const [lngInput, setLngInput] = useState("");

  const draftDirtyRef = useRef(false);



  useEffect(() => {

    setLocationInput(pickBilingual(locationDisplay, language));

  }, [locationDisplay, language]);



  useEffect(() => {

    if (draftDirtyRef.current) return;

    const preview = previewCoordsForSource(source, geoCoords, manualCoords, coords);

    setLatInput(preview.lat);

    setLngInput(preview.lng);

  }, [source, geoCoords, manualCoords, coords]);



  const previewCountryCoords = (nextValue: string) => {

    const resolved = resolveCountryInput(nextValue);

    if (!resolved) return;

    setLocationInput(countryOptionLabel(resolved));

    setLatInput(formatCoord(resolved.lat));

    setLngInput(formatCoord(resolved.lng));

    draftDirtyRef.current = true;

  };



  const handleSubmit = () => {

    const resolved = resolveCountryInput(locationInput);

    const lat = parseCoordInput(latInput);

    const lng = parseCoordInput(lngInput);

    applyLocation({

      countryId: resolved?.id ?? null,

      lat,

      lng,

    });

    draftDirtyRef.current = false;

  };



  const submitLabel = source === "manual" ? UI.updateLocation : UI.submitLocation;

  const { sunrise, nextSunrise } = getDayCycleBounds(value, coords);

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

              value={toDateInputValue(value)}

              onChange={(event) => onChange(applyDatePart(value, event.target.value))}

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

            value={toTimeInputValue(value)}

            onChange={(event) => onChange(applyTimePart(value, event.target.value))}

          />

        </label>



        <label className="datetime-field datetime-field--location">

          <span className="datetime-field__label">

            <BilingualText text={UI.location} />

          </span>

          <input

            type="text"

            className="datetime-field__input datetime-field__combobox"

            list={listId}

            value={locationInput}

            onChange={(event) => {

              draftDirtyRef.current = true;

              setLocationInput(event.target.value);

            }}

            onBlur={(event) => previewCountryCoords(event.target.value)}

            onKeyDown={(event) => {

              if (event.key === "Enter") {

                event.preventDefault();

                previewCountryCoords(locationInput);

              }

            }}

            placeholder={pickBilingual(UI.location, language)}

            aria-label={pickBilingual(UI.location, language)}

            autoComplete="off"

          />

          <datalist id={listId}>

            {COUNTRIES.map((country) => (

              <option key={country.id} value={countryOptionLabel(country)} />

            ))}

          </datalist>

        </label>



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

          onClick={handleSubmit}

          aria-label={pickBilingual(submitLabel, language)}

        >

          <BilingualText text={submitLabel} />

        </button>

      </div>

      <div className="datetime-card__summary">
        <p className="datetime-card__range">
          <BilingualText text={UI.sunrise} block={false} /> {formatTime(sunrise)} –{" "}
          <BilingualText text={UI.nextSunrise} block={false} /> {formatTime(nextSunrise)}
        </p>
      </div>

    </section>

  );

}

