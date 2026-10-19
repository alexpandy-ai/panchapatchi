import { useEffect, useMemo, useRef, useState } from "react";
import { ThithiMoonChart } from "./ThithiMoonChart";
import { useLanguage, type AppLanguage } from "../context/LanguageContext";
import { useLocation } from "../context/LocationContext";
import { pickBilingual, type Bilingual } from "../utils/bilingual";
import { LOCATION_DISPLAY, type GeoCoords } from "../utils/location";
import {
  calendarYear,
  firstCalendarYear,
  formatPlaceTime,
  lastCalendarYear,
  monthCells,
  peekCalendarYear,
  placeKey,
  placeWallClock,
  thithiLabel,
  degreeRange,
  type CalendarDay,
  type ThithiPlace,
} from "../thithiCalendar/calendar";
import { cardDateKey } from "../thithiCalendar/dailyThithi";
import {
  criticalDateAria,
  MONTH_NUMBERS,
  monthName,
  outOfRangeText,
  PIRAI_NAMES,
  reviewReasonText,
  TD,
  thithiNameBi,
} from "../thithiCalendar/labels";
import { thithiIndexToSelection } from "../thithiCalendar/thithiIds";
import { useDailyThithi } from "../thithiCalendar/useDailyThithi";
import "../thithiCalendar/thithiCalendar.css";

type CalendarMode = "annual" | "chart" | "daily";

const TABS: { id: CalendarMode; label: Bilingual }[] = [
  { id: "annual", label: TD.chipAnnual },
  { id: "chart", label: TD.chipChart },
  { id: "daily", label: TD.chipDaily },
];

function DateButton({
  row,
  label,
  language,
  onChoose,
}: {
  row: CalendarDay;
  label: string;
  language: AppLanguage;
  onChoose: (date: string) => void;
}) {
  return (
    <button
      type="button"
      className={row.critical ? "thithi-calendar__date-button thithi-calendar__critical" : "thithi-calendar__date-button"}
      aria-label={row.critical ? criticalDateAria(row.date, language) : row.date}
      onClick={() => onChoose(row.date)}
    >
      {label}
      {row.critical ? " ⚠" : ""}
    </button>
  );
}

interface ThithiDetailsViewProps {
  selectedDateTime: Date;
  onDateTimeChange: (next: Date) => void;
}

/** A selection this close to the device clock (initial load or மீட்டமை) follows live time. */
const LIVE_WINDOW_MS = 2 * 60_000;

function formatLatLng({ lat, lng }: GeoCoords): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

function zoneLabel(place: ThithiPlace): string {
  if (place.timeZone) return place.timeZone;
  const minutes = place.offsetMinutes ?? 0;
  const abs = Math.abs(minutes);
  return `UTC${minutes < 0 ? "−" : "+"}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

export function ThithiDetailsView({ selectedDateTime, onDateTimeChange }: ThithiDetailsViewProps) {
  const { locationDisplay } = useLocation();
  const { language } = useLanguage();
  const pick = (text: Bilingual) => pickBilingual(text, language);
  const { place, locating, daily } = useDailyThithi(selectedDateTime);
  const placeLabel = pick(locationDisplay);
  const placeSummary = place.coords
    ? `${placeLabel} · ${formatLatLng(place.coords)} · ${zoneLabel(place)}`
    : `${placeLabel} · ${pick(TD.fixedSunTimes)} · ${zoneLabel(place)}`;

  const firstYear = firstCalendarYear();
  const lastYear = lastCalendarYear(place);
  const date = cardDateKey(selectedDateTime);
  const effective = daily && "effective" in daily ? daily.effective : null;
  const effectiveDate = effective?.effectiveDateKey ?? null;
  const selected = daily?.status === "ready" || daily?.status === "unnamed" ? daily.day : null;
  const lookupRef = useRef<HTMLElement>(null);
  const [year, setYear] = useState(() => Math.min(lastYear, Math.max(firstYear, Number(date.slice(0, 4)))));
  const [month, setMonth] = useState(() => Number(date.slice(5, 7)));
  const [mode, setMode] = useState<CalendarMode>("daily");
  const [calendar, setCalendar] = useState<{ key: string; rows: CalendarDay[] } | null>(null);
  const [computing, setComputing] = useState(true);
  const [error, setError] = useState("");
  const [showAnchors, setShowAnchors] = useState(false);
  const yearKey = `${placeKey(place)}#${year}`;

  useEffect(() => {
    setYear(Math.min(lastYear, Math.max(firstYear, Number(date.slice(0, 4)))));
    setMonth(Number(date.slice(5, 7)));
  }, [date, firstYear, lastYear]);

  useEffect(() => {
    setError("");
    if (locating) {
      setCalendar(null);
      setComputing(false);
      return;
    }

    const cached = peekCalendarYear(year, place);
    if (cached) {
      setCalendar({ key: yearKey, rows: cached });
      setComputing(false);
      return;
    }

    setCalendar(null);
    let cancel = false;
    setComputing(true);
    const handle = window.setTimeout(() => {
      try {
        const rows = calendarYear(year, place);
        if (cancel) return;
        setCalendar({ key: yearKey, rows });
        setComputing(false);
      } catch (caught) {
        if (cancel) return;
        setCalendar(null);
        setComputing(false);
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    }, 0);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [year, yearKey, place, locating]);

  useEffect(() => {
    if (!effective || Math.abs(selectedDateTime.getTime() - Date.now()) > LIVE_WINDOW_MS) return;
    // The card's wall clock is read as the place's wall clock, so fire when the device clock shows the next sunrise's place time.
    const end = placeWallClock(place, effective.cycleEnd);
    const boundary = new Date(end.year, end.month - 1, end.day, end.hour, end.minute, end.second + 1);
    const handle = window.setTimeout(
      () => onDateTimeChange(new Date()),
      Math.max(0, boundary.getTime() - Date.now()),
    );
    return () => window.clearTimeout(handle);
  }, [effective, place, selectedDateTime, onDateTimeChange]);

  const rows = calendar?.key === yearKey ? calendar.rows : null;
  const monthRows = useMemo(() => rows?.filter((row) => row.month === month) ?? [], [rows, month]);
  const monthLabel = monthName(month, language);

  function chooseDate(next: string) {
    const [nextYear, nextMonth, nextDay] = next.split("-").map(Number);
    const nextDateTime = new Date(selectedDateTime);
    nextDateTime.setFullYear(nextYear, nextMonth - 1, nextDay);
    onDateTimeChange(nextDateTime);
    setYear(nextYear);
    setMonth(nextMonth);
    lookupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);

  return (
    <section className="thithi-calendar">
      <section className="thithi-calendar__lookup" ref={lookupRef} aria-live="polite">
        <div className="thithi-calendar__result">
          {daily?.status === "locating" ? (
            <p>{pick(LOCATION_DISPLAY.detecting)}</p>
          ) : daily?.status === "error" ? (
            <p className="thithi-calendar__review" title={daily.detail}>
              {pick(daily.effective ? TD.calculationFailed : TD.sunriseFailed)}
            </p>
          ) : daily?.status === "outOfRange" ? (
            <p>{outOfRangeText(effectiveDate, language)}</p>
          ) : selected && effective ? (
            <>
              <div className="thithi-calendar__value">
                <strong>{thithiLabel(selected.assumed, language)}</strong>
              </div>
              {selected.critical ? (
                <div className="thithi-calendar__review">
                  <strong>{pick(TD.reviewDate)}</strong>
                  <ul>
                    {selected.reasons.map((reason, index) => (
                      <li key={`${reason.code}-${index}`}>{reviewReasonText(reason, language)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p>{pick(TD.computing)}</p>
          )}
        </div>
      </section>

      <div className="tabs thithi-calendar__tabs" role="tablist" aria-label={pick(TD.tabList)}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            className={mode === tab.id ? "tabs__btn tabs__btn--active" : "tabs__btn"}
            onClick={() => setMode(tab.id)}
          >
            {pick(tab.label)}
          </button>
        ))}
      </div>

      <section className="thithi-calendar__panel">
        <div className="thithi-calendar__toolbar">
          <div>
            <h3>{pick(mode === "annual" ? TD.tabAnnual : mode === "chart" ? TD.tabChart : TD.headingDaily)}</h3>
            {mode !== "chart" ? <p>{pick(TD.legend)}</p> : null}
          </div>
          <div className="thithi-calendar__actions">
            <label htmlFor="thithi-year">{pick(TD.year)}</label>
            <select
              id="thithi-year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <label htmlFor="thithi-month">{pick(TD.month)}</label>
            <select
              id="thithi-month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_NUMBERS.map((value) => (
                <option key={value} value={value}>
                  {monthName(value, language)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <p className="thithi-calendar__review" title={error}>
            {pick(TD.calculationFailed)}
          </p>
        ) : null}
        {locating ? <p>{pick(LOCATION_DISPLAY.detecting)}</p> : null}
        {computing && !rows ? <p>{pick(TD.computing)}</p> : null}

        {rows && mode === "chart" ? <ThithiMoonChart year={year} month={month} place={place} /> : null}

        {rows && mode === "daily" ? (
          <>
            <h3 className="thithi-calendar__section">
              {monthLabel} {year}
            </h3>
            <div className="thithi-calendar__scroll thithi-calendar__monthly">
              <table>
                <thead>
                  <tr>
                    <th>{pick(TD.date)}</th>
                    <th>{pick(TD.angleSunsetThithi)}</th>
                    <th>{pick(TD.sunriseThithi)}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((row) => (
                    <tr
                      key={row.date}
                      className={
                        [
                          row.critical ? "thithi-calendar__critical-row" : row.assumed === 29 ? "thithi-calendar__pournami" : "",
                          row.date === effectiveDate ? "thithi-calendar__effective-row" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      aria-current={row.date === effectiveDate ? "date" : undefined}
                    >
                      <td>
                        <DateButton row={row} label={row.date} language={language} onChoose={chooseDate} />
                        {row.date === effectiveDate ? <small>◆ {pick(TD.calculationDate)}</small> : null}
                      </td>
                      <td>
                        {thithiLabel(row.assumed, language)}
                        <small>
                          {row.angle}°–{row.endAngle}°
                        </small>
                      </td>
                      <td>{thithiLabel(row.actual, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {rows && mode === "annual" ? (
          <div>
            <h3 className="thithi-calendar__sequence">{pick(TD.annualHeading)}</h3>
            <p className="thithi-calendar__hint">{pick(TD.annualHint)}</p>
            {[0, 1].map((side) => (
              <section key={side} className="thithi-calendar__section">
                <h3>
                  {pick(PIRAI_NAMES[side ? "valarpirai" : "theipirai"])} · {year}
                </h3>
                <div className="thithi-calendar__scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{pick(TD.thithi)}</th>
                        {MONTH_NUMBERS.map((value) => (
                          <th key={value}>{monthName(value, language)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 15 }, (_, index) => {
                        const thithiIndex = index + side * 15;
                        return (
                          <tr key={thithiIndex}>
                            <td>
                              {pick(thithiNameBi(thithiIndexToSelection(thithiIndex)))}
                              <small>{degreeRange(thithiIndex)}</small>
                            </td>
                            {MONTH_NUMBERS.map((value) => {
                              const records = monthCells(rows, thithiIndex, value);
                              if (records.length === 0) {
                                return (
                                  <td key={value} className="thithi-calendar__empty">
                                    —
                                  </td>
                                );
                              }
                              const marked = records.some((record) => record.mark);
                              return (
                                <td key={value} className={marked ? "thithi-calendar__event" : undefined}>
                                  {records.map((record, recordIndex) => (
                                    <span key={record.date}>
                                      {recordIndex > 0 ? ", " : null}
                                      <DateButton
                                        row={record}
                                        label={`${record.d}${record.mark}`}
                                        language={language}
                                        onChoose={chooseDate}
                                      />
                                    </span>
                                  ))}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {rows && mode !== "chart" ? (
          <section className="thithi-calendar__review">
            <strong>
              {pick(TD.reviewDates)} · {monthLabel}
            </strong>
            <div className="thithi-calendar__review-list">
              {monthRows.some((row) => row.critical) ? (
                monthRows
                  .filter((row) => row.critical)
                  .map((row) => (
                    <DateButton
                      key={row.date}
                      row={row}
                      label={String(row.d)}
                      language={language}
                      onChoose={chooseDate}
                    />
                  ))
              ) : (
                <span>{pick(TD.none)}</span>
              )}
            </div>
          </section>
        ) : null}

        {rows && mode !== "chart" ? (
          <div className="thithi-calendar__anchors">
            <button
              type="button"
              className="thithi-calendar__anchors-toggle"
              aria-expanded={showAnchors}
              aria-controls="thithi-anchor-list"
              onClick={() => setShowAnchors((open) => !open)}
            >
              {showAnchors ? "▾" : "▸"} {pick(TD.listingDates)}
            </button>
            {showAnchors ? (
              <div id="thithi-anchor-list">
                {monthRows
                  .flatMap((row) => row.events)
                  .map((event) => (
                    <p key={`${event.sector}-${event.full}`}>
                      {thithiLabel(event.index, language)}: <b>{event.date}</b> · {event.angle}° {pick(TD.eventTime)}:{" "}
                      {formatPlaceTime(event.full, place, language)}
                      <br />
                      {pick(TD.sunsetInterval)}: {formatPlaceTime(event.intervalStart, place, language)} →{" "}
                      {formatPlaceTime(event.intervalEnd, place, language)}
                    </p>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <details>
        <summary>{pick(TD.methodSummary)}</summary>
        <div className="thithi-calendar__method">
          <p>{pick(TD.method1)}</p>
          <p>{pick(TD.method2)}</p>
          <p>{pick(TD.method3)}</p>
          <p>{pick(TD.method4)}</p>
          <p>
            {pick(TD.method5)} {pick(TD.place)}: {locating ? pick(LOCATION_DISPLAY.detecting) : placeSummary}.
            {pick(place.coords ? TD.placeZoneNote : TD.fixedPlaceNote)}
          </p>
          <p>
            {pick(TD.sources)}:{" "}
            <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">
              Astronomy Engine
            </a>{" "}
            ·{" "}
            <a href="https://aa.usno.navy.mil/data/MoonPhases" target="_blank" rel="noopener">
              {pick(TD.usnoLink)}
            </a>
          </p>
        </div>
      </details>
      <p className="thithi-calendar__footer">{pick(TD.footer)}</p>
    </section>
  );
}
