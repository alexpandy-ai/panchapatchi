import { useEffect, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLanguage } from "../context/LanguageContext";
import { useLocation } from "../context/LocationContext";
import { pickBilingual, UI } from "../utils/bilingual";
import { DEFAULT_PLACE } from "../utils/geocode";
import { kolkataDateKey, kolkataToday, type CivilDate } from "../utils/kolkataCivil";
import {
  CALENDAR_WEEKDAYS,
  GREGORIAN_MONTHS,
  MOON_UI,
  USNO_YEAR_MAX,
  USNO_YEAR_MIN,
} from "../utils/moonPhaseLabels";
import { resolvePlaceZone } from "../utils/placeTimeZone";
import {
  loadMoonMonth,
  moonMonthCacheKey,
  peekMoonMonth,
  type MoonMonthResult,
} from "../utils/usnoMoon";

type LoadStatus = "locating" | "loading" | "ready" | "error";

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } | null {
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  if (nextYear < USNO_YEAR_MIN || nextYear > USNO_YEAR_MAX) return null;
  return { year: nextYear, month: nextMonth };
}

export function ThithiDetailsView() {
  const { language } = useLanguage();
  const { coords, geoPending } = useLocation();
  const [today, setToday] = useState(() => kolkataToday());
  const [year, setYear] = useState(() => today.year);
  const [month, setMonth] = useState(() => today.month);
  const [yearDraft, setYearDraft] = useState(() => String(today.year));
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [result, setResult] = useState<MoonMonthResult | null>(null);
  const [errorDetail, setErrorDetail] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  const usingDefaultPlace = !coords && !geoPending;
  const latitude = coords?.lat ?? (usingDefaultPlace ? DEFAULT_PLACE.latitude : null);
  const longitude = coords?.lng ?? (usingDefaultPlace ? DEFAULT_PLACE.longitude : null);

  useEffect(() => {
    const id = window.setInterval(() => setToday(kolkataToday()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setYearDraft(String(year));
  }, [year]);

  useEffect(() => {
    if (latitude === null || longitude === null) {
      setStatus("locating");
      setResult(null);
      setErrorDetail("");
      return;
    }

    const zone = resolvePlaceZone(latitude, longitude);
    const cacheKey = moonMonthCacheKey(year, month, latitude, longitude, zone.cacheToken);
    const cached = peekMoonMonth(cacheKey);
    if (cached) {
      setResult(cached);
      setStatus("ready");
      setErrorDetail("");
      return;
    }

    let ignore = false;
    setStatus("loading");
    setResult(null);
    setErrorDetail("");
    loadMoonMonth(year, month, latitude, longitude)
      .then((data) => {
        if (ignore) return;
        setResult(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setResult(null);
        setStatus("error");
        setErrorDetail(error instanceof Error ? error.message : "");
      });

    return () => {
      ignore = true;
    };
  }, [latitude, longitude, year, month, retryToken]);

  const todayMonth = GREGORIAN_MONTHS[today.month - 1];
  const todayWeekday = CALENDAR_WEEKDAYS[today.weekday];
  const todayLabel = todayMonth && todayWeekday
    ? `${today.day} ${pickBilingual(todayMonth, language)} ${today.year} · ${pickBilingual(todayWeekday, language)}`
    : kolkataDateKey(today);

  const dateHeader = pickBilingual(UI.date, language);
  const dayHeader = pickBilingual(UI.day, language);
  const phaseHeader = pickBilingual(MOON_UI.moonPhase, language);
  const illuminationHeader = pickBilingual(MOON_UI.illumination, language);
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  function commitYear(value: string) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= USNO_YEAR_MIN && parsed <= USNO_YEAR_MAX) {
      setYear(parsed);
      return;
    }
    setYearDraft(String(year));
  }

  function applyMonth(nextMonth: CivilDate["month"], nextYear = year) {
    setMonth(nextMonth);
    setYear(nextYear);
  }

  return (
    <section className="schedule-table-card moon-phase-card" aria-busy={status === "loading" || status === "locating"}>
      <h2 className="schedule-table-card__title">
        <BilingualText text={UI.thithiDetails} />
      </h2>
      <div className="moon-phase">
        <p className="moon-phase-today">
          <span className="moon-phase-today__label">
            <BilingualText text={MOON_UI.todayKolkata} />
          </span>
          <strong className="moon-phase-today__date">
            {todayLabel}
            <span className="moon-phase-today__iso">{kolkataDateKey(today)}</span>
          </strong>
        </p>

        <div className="moon-phase-controls">
          <button
            type="button"
            className="moon-phase-controls__step"
            disabled={!previous}
            aria-label={pickBilingual(MOON_UI.previousMonth, language)}
            onClick={() => {
              if (previous) applyMonth(previous.month, previous.year);
            }}
          >
            ‹
          </button>
          <label className="moon-phase-controls__field moon-phase-controls__field--month">
            <span className="moon-phase-controls__label">
              <BilingualText text={MOON_UI.month} />
            </span>
            <select
              id="moon-phase-month"
              value={month}
              onChange={(event) => applyMonth(Number(event.target.value))}
            >
              {GREGORIAN_MONTHS.map((label, index) => (
                <option key={label.en} value={index + 1}>
                  {pickBilingual(label, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="moon-phase-controls__field moon-phase-controls__field--year">
            <span className="moon-phase-controls__label">
              <BilingualText text={MOON_UI.year} />
            </span>
            <input
              id="moon-phase-year"
              type="number"
              inputMode="numeric"
              min={USNO_YEAR_MIN}
              max={USNO_YEAR_MAX}
              value={yearDraft}
              onChange={(event) => setYearDraft(event.target.value)}
              onBlur={() => commitYear(yearDraft)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="moon-phase-controls__step"
            disabled={!next}
            aria-label={pickBilingual(MOON_UI.nextMonth, language)}
            onClick={() => {
              if (next) applyMonth(next.month, next.year);
            }}
          >
            ›
          </button>
        </div>

        <p className="moon-phase-note">
          <BilingualText text={MOON_UI.phaseAtLocalNoon} />
          {result ? <span className="moon-phase-note__zone">{result.timeZoneLabel}</span> : null}
        </p>
        <p className="moon-phase-note moon-phase-note--quiet">
          <BilingualText text={MOON_UI.notTithi} />
        </p>
        {usingDefaultPlace ? (
          <p className="moon-phase-note moon-phase-note--quiet">
            <BilingualText text={MOON_UI.defaultPlace} />
          </p>
        ) : null}

        {status === "locating" ? (
          <p className="moon-phase-status" role="status">
            <BilingualText text={MOON_UI.locating} />
          </p>
        ) : null}

        {status === "loading" ? (
          <p className="moon-phase-status" role="status">
            <BilingualText text={MOON_UI.loading} />
          </p>
        ) : null}

        {status === "error" ? (
          <div className="moon-phase-status moon-phase-status--error" role="alert">
            <p>
              <BilingualText text={MOON_UI.loadError} />
            </p>
            {errorDetail ? <p className="moon-phase-status__detail">{errorDetail}</p> : null}
            <button type="button" className="moon-phase-retry" onClick={() => setRetryToken((token) => token + 1)}>
              <BilingualText text={MOON_UI.retry} />
            </button>
          </div>
        ) : null}

        {status === "ready" && result ? (
          <div className="moon-phase-table-wrap">
            <table className="moon-phase-table">
              <caption className="moon-phase-table__caption">
                <BilingualText text={MOON_UI.phaseAtLocalNoon} />
              </caption>
              <thead>
                <tr>
                  <th scope="col">{dateHeader}</th>
                  <th scope="col">{dayHeader}</th>
                  <th scope="col">{phaseHeader}</th>
                  <th scope="col">{illuminationHeader}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const iso = kolkataDateKey(row);
                  const isToday = row.year === today.year && row.month === today.month && row.day === today.day;
                  const weekday = CALENDAR_WEEKDAYS[row.weekday];
                  return (
                    <tr
                      key={iso}
                      className={[
                        isToday ? "moon-phase-table__row--today" : "",
                        row.quarters.length > 0 ? "moon-phase-table__row--event" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td data-label={dateHeader}>
                        <span className="moon-phase-table__value">
                          <span className="moon-phase-table__date">{row.day}</span>
                          <span className="moon-phase-table__iso">{iso}</span>
                        </span>
                      </td>
                      <td data-label={dayHeader}>
                        <span className="moon-phase-table__value">
                          {weekday ? pickBilingual(weekday, language) : ""}
                        </span>
                      </td>
                      <td data-label={phaseHeader}>
                        <span className="moon-phase-table__value moon-phase-table__phase">
                          <span>{row.phase}</span>
                          {row.quarters.length > 0 ? (
                            <span className="moon-phase-events">
                              {row.quarters.map((quarter) => (
                                <span
                                  key={`${quarter.phase}-${quarter.hour}-${quarter.minute}`}
                                  className="moon-phase-event"
                                >
                                  <span className="moon-phase-event__name">{quarter.phase}</span>
                                  <time dateTime={`${iso}T${formatClock(quarter.hour, quarter.minute)}`}>
                                    {formatClock(quarter.hour, quarter.minute)}
                                  </time>
                                  <span className="moon-phase-event__zone">Asia/Kolkata</span>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td data-label={illuminationHeader}>
                        <span className="moon-phase-table__value">{row.illumination}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
