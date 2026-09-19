import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import {
  getAlternateEatingPatchi,
  getDayEatingPatchiOnThithiBracketDay,
  getPatchiDaysDayForAthikaraPatchi,
  getPatchiDaysWeekdayForAthikaraPatchi,
} from "../utils/alternateCalculation";
import {
  jamamBilingual,
  PAKSHA_BI,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
} from "../utils/bilingual";
import { formatTime, getJamamState } from "../utils/jamam";
import type { GeoCoords } from "../utils/location";
import { getSunrise } from "../utils/sunrise";
import { getNightThithiPatchiEntryForDate } from "../utils/thithi";

export interface FindPatchiQuery {
  date: Date;
  coords: GeoCoords | null;
}

interface FindPatchiViewProps {
  query: FindPatchiQuery | null;
}

/**
 * Find Patchi page (same thithi path as Home):
 * 1. Sunset → Night Thithi + pirai → Thithi Patchi table row
 * 2. Bracket day on that row → jamam-1 morning Eat bird (Home Athikara)
 * 3. That bird’s Day Scheduler weekday → Eating bird in the selected jamam
 */
export function FindPatchiView({ query }: FindPatchiViewProps) {
  const result = useMemo(() => {
    if (!query) return null;

    const sunrise = getSunrise(query.date, query.coords);
    const entry = getNightThithiPatchiEntryForDate(query.date, query.coords);
    const pakshaId = entry.pakshaId;
    const athikaraPatchi =
      getDayEatingPatchiOnThithiBracketDay(pakshaId, entry.patchi) ?? entry.patchi;

    const scheduleDay = getPatchiDaysDayForAthikaraPatchi(pakshaId, athikaraPatchi);
    const scheduleWeekday = getPatchiDaysWeekdayForAthikaraPatchi(
      pakshaId,
      athikaraPatchi,
    );
    const jamam = getJamamState(query.date, query.coords);

    const jamamPatchi =
      scheduleWeekday !== null
        ? getAlternateEatingPatchi(
            pakshaId,
            scheduleWeekday,
            jamam.yamaIndex,
            jamam.period,
          )
        : null;

    return {
      sunrise,
      pakshaId,
      entry,
      athikaraPatchi,
      scheduleDay,
      activeJamamIndex: jamam.jamamIndex,
      jamamPatchi,
    };
  }, [query]);

  if (!result) {
    return (
      <p className="status find-patchi-hint">
        <BilingualText text={UI.findPatchiHint} />
      </p>
    );
  }

  const {
    sunrise,
    pakshaId,
    entry,
    athikaraPatchi,
    scheduleDay,
    activeJamamIndex,
    jamamPatchi,
  } = result;

  return (
    <section className="find-patchi-result" aria-live="polite">
      <div className="find-patchi-result__panel">
        <div className="find-patchi-result__card find-patchi-result__card--thithi">
          <p className="find-patchi-result__label">
            <BilingualText text={UI.yourPatchiIs} />
          </p>
          <p className="find-patchi-result__value find-patchi-result__value--thithi">
            <InlineEmojiLabel
              text={patchiLabelBilingual(athikaraPatchi)}
              emoji={patchiEmoji(athikaraPatchi)}
              emojiPosition="after"
            />
          </p>
        </div>

        {jamamPatchi ? (
          <>
            <div className="find-patchi-result__divider" aria-hidden="true" />
            <div className="find-patchi-result__card find-patchi-result__card--jamam">
              <p className="find-patchi-result__label">
                <BilingualText text={UI.yourJamamPatchi} />
              </p>
              <p className="find-patchi-result__value find-patchi-result__value--jamam">
                <InlineEmojiLabel
                  text={patchiLabelBilingual(jamamPatchi)}
                  emoji={patchiEmoji(jamamPatchi)}
                  emojiPosition="after"
                />
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="find-patchi-result__meta">
        <div className="find-patchi-result__meta-row">
          <span className="find-patchi-result__meta-label">
            <BilingualText text={UI.sunrise} block={false} />
          </span>
          <span className="find-patchi-result__meta-value find-patchi-result__meta-value--time">
            {formatTime(sunrise)}
          </span>
        </div>
        <div className="find-patchi-result__meta-row">
          <span className="find-patchi-result__meta-label">
            <BilingualText text={UI.paksha} block={false} />
          </span>
          <span className="find-patchi-result__meta-value">
            <BilingualText text={PAKSHA_BI[pakshaId]} block={false} />
          </span>
        </div>
        <div className="find-patchi-result__meta-row">
          <span className="find-patchi-result__meta-label">
            <BilingualText text={UI.nightThithi} block={false} />
          </span>
          <span className="find-patchi-result__meta-value">
            <BilingualText text={entry.thithi} block={false} />
          </span>
        </div>
        {scheduleDay ? (
          <div className="find-patchi-result__meta-row">
            <span className="find-patchi-result__meta-label">
              <BilingualText text={UI.day} block={false} />
            </span>
            <span className="find-patchi-result__meta-value">
              <BilingualText text={scheduleDay} block={false} />
            </span>
          </div>
        ) : null}
        {activeJamamIndex != null ? (
          <div className="find-patchi-result__meta-row">
            <span className="find-patchi-result__meta-label">
              <BilingualText text={UI.jamam} block={false} />
            </span>
            <span className="find-patchi-result__meta-value">
              <BilingualText text={jamamBilingual(activeJamamIndex)} block={false} />
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
