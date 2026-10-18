import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import {
  jamamBilingual,
  PAKSHA_BI,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import { yamaFromJamamIndex } from "../utils/jamam";
import type { GeoCoords } from "../utils/location";
import { getThithiPatchiEntryForThithiNumber } from "../utils/thithi";
import {
  THITHI_SCHEDULE_MISS,
  thithiScheduleActiveJamam,
  thithiScheduleBirdDoing,
  thithiScheduleDayFacts,
} from "../utils/thithiSchedule";
import { TD, UNNAMED_SECTOR } from "../thithiCalendar/labels";
import { useDailyThithi } from "../thithiCalendar/useDailyThithi";

export interface FindPatchiQuery {
  date: Date;
  coords: GeoCoords | null;
}

interface FindPatchiViewProps {
  query: FindPatchiQuery | null;
}

/**
 * Find Patchi page (same thithi path as Home):
 * 1. Submitted date, time and location → shared daily thithi (Thithi Details) → Pirai + thithi
 * 2. Thithi Schedule row for that Pirai / thithi → Jamam 1 morning Eat bird (Athikara)
 * 3. Same row → bird Eating in the jamam containing the submitted time
 */
export function FindPatchiView({ query }: FindPatchiViewProps) {
  const { daily } = useDailyThithi(query?.date ?? new Date(0), query !== null, query?.coords ?? null);
  const selection = daily?.status === "ready" ? daily.selection : null;
  const pakshaId = selection?.pakshaId ?? null;
  const thithiNumber = selection?.thithiNumber ?? null;

  const result = useMemo(() => {
    if (!query || pakshaId === null || thithiNumber === null) return null;

    const entry = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber);
    const dayFacts = thithiScheduleDayFacts(pakshaId, thithiNumber);
    const { jamamSlot } = thithiScheduleActiveJamam(query.date, query.coords);
    const { yama, period } = yamaFromJamamIndex(jamamSlot.index);

    return {
      entry,
      athikaraPatchi: dayFacts?.athikara ?? null,
      activeJamamIndex: jamamSlot.index,
      jamamPatchi: thithiScheduleBirdDoing(pakshaId, thithiNumber, yama, period, "ஊண்"),
    };
  }, [query, pakshaId, thithiNumber]);

  if (!query) {
    return (
      <p className="status find-patchi-hint">
        <BilingualText text={UI.findPatchiHint} />
      </p>
    );
  }

  if (!result) {
    const unresolved: Bilingual =
      daily?.status === "unnamed"
        ? UNNAMED_SECTOR
        : daily?.status === "outOfRange"
          ? TD.outOfRangeShort
          : daily?.status === "error"
            ? TD.calculationFailed
            : TD.computing;
    return (
      <p className="status find-patchi-hint" aria-live="polite">
        <BilingualText text={unresolved} />
      </p>
    );
  }

  if (!result.athikaraPatchi) {
    return (
      <p className="status find-patchi-hint" aria-live="polite">
        <BilingualText text={THITHI_SCHEDULE_MISS.noScheduleRow} />
      </p>
    );
  }

  const { entry, athikaraPatchi, activeJamamIndex, jamamPatchi } = result;

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
            <BilingualText text={UI.paksha} block={false} />
          </span>
          <span className="find-patchi-result__meta-value">
            <BilingualText text={PAKSHA_BI[entry.pakshaId]} block={false} />
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
        <div className="find-patchi-result__meta-row">
          <span className="find-patchi-result__meta-label">
            <BilingualText text={UI.thithiDay} block={false} />
          </span>
          <span className="find-patchi-result__meta-value">
            <BilingualText text={entry.day} block={false} />
          </span>
        </div>
        <div className="find-patchi-result__meta-row">
          <span className="find-patchi-result__meta-label">
            <BilingualText text={UI.jamam} block={false} />
          </span>
          <span className="find-patchi-result__meta-value">
            <BilingualText text={jamamBilingual(activeJamamIndex)} block={false} />
          </span>
        </div>
      </div>
    </section>
  );
}
