import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import {
  getAlternateEatingPatchi,
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
import { getPakshaFromDate } from "../utils/paksha";
import { getSunrise } from "../utils/sunrise";
import { getThithiPatchiEntryForDate } from "../utils/thithi";

export interface FindPatchiQuery {
  date: Date;
  coords: GeoCoords | null;
}

interface FindPatchiViewProps {
  query: FindPatchiQuery | null;
}

/**
 * Find Patchi page:
 * 1. Sunrise → pirai + thithi → Your Thithi Patchi (Information Thithi table)
 * 2. That bird → Day Scheduler pirai → Patchi Days / All Chips day column
 * 3. Jamam for selected time → Eating bird → Your Jamam Patchi
 */
export function FindPatchiView({ query }: FindPatchiViewProps) {
  const result = useMemo(() => {
    if (!query) return null;

    const sunrise = getSunrise(query.date, query.coords);
    const pakshaId = getPakshaFromDate(sunrise);
    const entry = getThithiPatchiEntryForDate(sunrise, pakshaId);

    const scheduleDay = getPatchiDaysDayForAthikaraPatchi(pakshaId, entry.patchi);
    const scheduleWeekday = getPatchiDaysWeekdayForAthikaraPatchi(
      pakshaId,
      entry.patchi,
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
              text={patchiLabelBilingual(entry.patchi)}
              emoji={patchiEmoji(entry.patchi)}
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
            <BilingualText text={UI.thithi} block={false} />
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
