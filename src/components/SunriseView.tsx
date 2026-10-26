import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { useLanguage } from "../context/LanguageContext";
import { useLocation } from "../context/LocationContext";
import { cardDateKey, placeForCoords } from "../thithiCalendar/dailyThithi";
import { MORNING_SUN_BI, pickBilingual, UI } from "../utils/bilingual";
import { formatPlaceClock, morningSunTimes, type SunPlace } from "../utils/morningSun";
import { timeZoneOffsetMs } from "../utils/placeTimeZone";
import "./SunriseView.css";

interface SunriseViewProps {
  /** The app's shared selected date (set from the date card on Home and other pages). */
  selectedDateTime: Date;
}

export function SunriseView({ selectedDateTime }: SunriseViewProps) {
  const { coords, locationDisplay } = useLocation();
  const { language } = useLanguage();
  const lat = coords?.lat ?? null;
  const lng = coords?.lng ?? null;
  const dateKey = cardDateKey(selectedDateTime);
  const [year, month, day] = dateKey.split("-");

  const place = useMemo(
    () => (lat !== null && lng !== null ? (placeForCoords({ lat, lng }) as SunPlace) : null),
    [lat, lng],
  );
  const rows = useMemo(() => (place ? morningSunTimes(place, dateKey) : null), [place, dateKey]);

  const placeLabel = pickBilingual(locationDisplay, language);

  if (!place || !rows) {
    return (
      <div className="status">
        <p>{placeLabel}</p>
        <p>
          <BilingualText text={UI.sunriseNeedsLocation} />
        </p>
      </div>
    );
  }

  return (
    <section className="sunrise-page" aria-live="polite">
      <p className="sunrise-page__meta">
        {`${day}-${month}-${year} · ${placeLabel}`}
        {place.timeZone &&
        Math.round(timeZoneOffsetMs(place.timeZone, selectedDateTime) / 60_000) !==
          -selectedDateTime.getTimezoneOffset()
          ? ` · ${place.timeZone}`
          : ""}
      </p>
      <ol className="sunrise-times">
        {rows.map((row) => (
          <li key={row.id} className="sunrise-times__card">
            <span className="sunrise-times__name">
              <BilingualText text={MORNING_SUN_BI[row.id].name} />
            </span>
            <span className="sunrise-times__angle">
              <BilingualText text={MORNING_SUN_BI[row.id].angle} />
            </span>
            {row.time ? (
              <span className="sunrise-times__time">{formatPlaceClock(place, row.time)}</span>
            ) : (
              <span className="sunrise-times__time sunrise-times__time--missing">
                <BilingualText text={UI.notReachedOnDate} />
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="sunrise-page__note">
        <BilingualText text={UI.sunriseUsedThroughout} />
      </p>
    </section>
  );
}
