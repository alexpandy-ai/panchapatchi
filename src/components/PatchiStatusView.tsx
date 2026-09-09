import { useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";

import { InlineEmojiLabel } from "./InlineEmojiLabel";
import { PatchiFilterChips } from "./PatchiPickerBlock";

import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";

import type { PakshaData } from "../types";

import {
  ANTHARA_DAY_SEGMENT_COUNT,
  ANTHARA_NIGHT_SEGMENT_COUNT,
  getAntharaSegmentIndex,
  JAMAM_ANTHARA_SEGMENT_COUNT,
} from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import {

  PAKSHA_BI,

  PATCHI_ORDER,
  patchiEmoji,
  patchiLabelBilingual,
  thozhilHeader,
  thozhilValueWithTime,
  UI,
} from "../utils/bilingual";

import {
  cycleStartFor,
  formatTimeRange,
  getJamamSlotByIndex,
  getJamamState,
  getNextJamamIndex,
  yamaFromJamamIndex,
  type PeriodId,
} from "../utils/jamam";

import {
  getAlternateJamamActivitySlots,
  getAlternatePatchiJamamActivityForWeekday,
} from "../utils/alternateCalculation";

import { derivePatchiStatusFromSchedule } from "../utils/patchi";

import { getPakshaFromDate, type PakshaId } from "../utils/paksha";
import { getThithiPatchiEntryForDate } from "../utils/thithi";

interface PatchiStatusViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
  /** Home: compact thithi/athikara line and date-based paksha only. Status: full layout. */
  variant?: "home" | "status";
}

export function PatchiStatusView({
  selectedDateTime,
  data,
  variant = "status",
}: PatchiStatusViewProps) {
  const isHome = variant === "home";

  const { coords } = useLocation();

  const {
    paksha: navigationPakshaId,
    setPaksha: setPakshaId,
    myPatchi: myPatchiSelection,
    setMyPatchi: setMyPatchiSelection,
  } = useNavigation();

  const homePatchi =
    myPatchiSelection === "all" ? PATCHI_ORDER[0] : myPatchiSelection;

  const myPatchi = isHome ? homePatchi : myPatchiSelection === "all" ? PATCHI_ORDER[0] : myPatchiSelection;

  const [antharaDialogTarget, setAntharaDialogTarget] = useState<"current" | "next" | null>(
    null,
  );

  const weekday = selectedDateTime.getDay();
  const currentPakshaId = isHome ? getPakshaFromDate(selectedDateTime) : navigationPakshaId;
  const pakshaId = currentPakshaId;

  const thithiPatchiEntry = useMemo(
    () => getThithiPatchiEntryForDate(selectedDateTime, pakshaId),
    [selectedDateTime, pakshaId],
  );

  const thithiScheduleWeekday = thithiPatchiEntry.weekday;
  const athikaraPatchi = thithiPatchiEntry.patchi;

  const paksha = data[pakshaId];

  const jamam = getJamamState(selectedDateTime, coords);

  const activeSlot = jamam.slots.find((s) => s.isActive) ?? jamam.slots[0];

  const cycleStart = cycleStartFor(selectedDateTime, coords);

  const nextJamamIndex = getNextJamamIndex(jamam.jamamIndex);

  const nextSlot = getJamamSlotByIndex(

    jamam.slots,

    jamam.jamamIndex,

    nextJamamIndex,

    cycleStart,

    coords,

  );



  const derived = useMemo(() => {

    if (!paksha) {

      return {

        athikaraGroupKey: null,

        myPatchi: null,

        myPatchiActivity: null,

        jamamSlots: [],

      };

    }

    return derivePatchiStatusFromSchedule(

      paksha,

      weekday,

      athikaraPatchi,

      jamam.yamaIndex,

      jamam.period,

      myPatchi,

    );

  }, [paksha, weekday, athikaraPatchi, myPatchi, jamam.yamaIndex, jamam.period]);

  const homeJamamActivity = useMemo(() => {
    if (!isHome || (pakshaId !== "valarpirai" && pakshaId !== "theipirai")) return null;
    return getAlternatePatchiJamamActivityForWeekday(
      pakshaId,
      thithiScheduleWeekday,
      jamam.yamaIndex,
      jamam.period,
      homePatchi,
    );
  }, [homePatchi, isHome, jamam.period, jamam.yamaIndex, pakshaId, thithiScheduleWeekday]);

  const derivedNext = useMemo(() => {
    if (isHome) return { myPatchiActivity: null };

    if (!paksha || !nextSlot) {

      return { myPatchiActivity: null };

    }

    const { yama, period } = yamaFromJamamIndex(nextSlot.index);

    return derivePatchiStatusFromSchedule(

      paksha,

      weekday,

      athikaraPatchi,

      yama,

      period,

      myPatchi,

    );

  }, [isHome, paksha, weekday, athikaraPatchi, myPatchi, nextSlot]);

  const antharaGroup = useMemo(
    () => paksha?.groups.find((group) => group.key === derived.athikaraGroupKey) ?? null,
    [paksha, derived.athikaraGroupKey],
  );

  const antharaDialogProps = useMemo(() => {
    if (isHome) {
      if (antharaDialogTarget !== "current" || !activeSlot) return null;
      if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return null;

      return {
        jamamSlot: activeSlot,
        getActivitySlots: (yama: number, period: PeriodId) =>
          getAlternateJamamActivitySlots(pakshaId, thithiScheduleWeekday, yama, period),
        highlightPatchi: homePatchi,
        highlightThozhil: homeJamamActivity ?? "—",
        highlightSegmentIndex: getAntharaSegmentIndex(
          activeSlot.start,
          activeSlot.end,
          selectedDateTime,
          jamam.period === "night"
            ? ANTHARA_NIGHT_SEGMENT_COUNT
            : JAMAM_ANTHARA_SEGMENT_COUNT,
        ),
      };
    }

    if (!antharaGroup) return null;

    if (antharaDialogTarget === "current") {
      if (!activeSlot) return null;

      return {
        jamamSlot: activeSlot,
        getActivitySlots: (yama: number, period: PeriodId) => {
          const yamaRow = antharaGroup.yamas.find((row) => row.yama === yama);
          if (!yamaRow) return [];
          return period === "day" ? yamaRow.day : yamaRow.night;
        },
        highlightPatchi: myPatchi,
        highlightThozhil: derived.myPatchiActivity ?? "—",
        highlightSegmentIndex: getAntharaSegmentIndex(
          activeSlot.start,
          activeSlot.end,
          selectedDateTime,
          jamam.period === "night"
            ? ANTHARA_NIGHT_SEGMENT_COUNT
            : JAMAM_ANTHARA_SEGMENT_COUNT,
        ),
      };
    }

    if (antharaDialogTarget === "next") {
      if (!nextSlot) return null;

      return {
        jamamSlot: nextSlot,
        getActivitySlots: (yama: number, period: PeriodId) => {
          const yamaRow = antharaGroup.yamas.find((row) => row.yama === yama);
          if (!yamaRow) return [];
          return period === "day" ? yamaRow.day : yamaRow.night;
        },
        highlightPatchi: myPatchi,
        highlightThozhil: derivedNext.myPatchiActivity ?? "—",
      };
    }

    return null;
  }, [
    activeSlot,
    thithiScheduleWeekday,
    antharaDialogTarget,
    antharaGroup,
    derived.myPatchiActivity,
    derivedNext.myPatchiActivity,
    homeJamamActivity,
    homePatchi,
    isHome,
    jamam.period,
    myPatchi,
    nextSlot,
    pakshaId,
    selectedDateTime,
  ]);

  const currentJamamActivity = isHome ? homeJamamActivity : derived.myPatchiActivity;



  if (!paksha) {

    return (

      <p className="status">

        <BilingualText text={UI.loading} />

      </p>

    );

  }



  return (

    <div className="now-view">

      <section className={["context-card", isHome ? "context-card--home" : ""].filter(Boolean).join(" ")}>

        {isHome ? (
          <>
            <div className="context-row context-row--home-thithi">
              <span className="context-inline-item">
                <span className="context-label">
                  <BilingualText text={UI.thithi} block={false} />
                </span>
                <span className="context-value context-value--thithi-paksha">
                  <BilingualText text={thithiPatchiEntry.thithi} block={false} />
                  <span className="context-value__sep" aria-hidden="true">
                    ·
                  </span>
                  <BilingualText text={PAKSHA_BI[currentPakshaId]} block={false} />
                </span>
              </span>
            </div>

            <div className="context-row context-row--home-day-athikara">
              <span className="context-inline-item">
                <span className="context-label">
                  <BilingualText text={UI.day} block={false} />
                </span>
                <span className="context-value">
                  <BilingualText text={thithiPatchiEntry.day} block={false} />
                </span>
              </span>
              <span className="context-inline-item">
                <span className="context-label">
                  <BilingualText text={UI.athikaraPatchi} block={false} />
                </span>
                <span className="context-value">
                  <InlineEmojiLabel
                    text={patchiLabelBilingual(athikaraPatchi)}
                    emoji={patchiEmoji(athikaraPatchi)}
                  />
                </span>
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="context-row">
              <span className="context-label">
                <BilingualText text={UI.thithi} block={false} />
              </span>
              <span className="context-value">
                <BilingualText text={thithiPatchiEntry.thithi} block={false} />
              </span>
            </div>

            <div className="context-row">
              <span className="context-label">
                <BilingualText text={UI.athikaraPatchi} block={false} />
              </span>
              <span className="context-value">
                <InlineEmojiLabel
                  text={patchiLabelBilingual(athikaraPatchi)}
                  emoji={patchiEmoji(athikaraPatchi)}
                />
              </span>
            </div>

            <div className="context-row context-row--paksha">
              <span className="context-label">
                <BilingualText text={UI.paksha} block={false} />
              </span>
              <div className="paksha-toggle">
                <button
                  type="button"
                  className={navigationPakshaId === "valarpirai" ? "active" : ""}
                  onClick={() => setPakshaId("valarpirai")}
                >
                  <BilingualText text={PAKSHA_BI.valarpirai} />
                </button>
                <button
                  type="button"
                  className={navigationPakshaId === "theipirai" ? "active" : ""}
                  onClick={() => setPakshaId("theipirai")}
                >
                  <BilingualText text={PAKSHA_BI.theipirai} />
                </button>
              </div>
            </div>
          </>
        )}

        <div
          className={[
            "context-row",
            "context-row--patchi-filter",
            isHome ? "context-row--patchi-filter-home" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {!isHome ? (
            <span className="context-label">
              <BilingualText text={UI.myPatchi} block={false} />
            </span>
          ) : null}
          <PatchiFilterChips
            selected={isHome ? homePatchi : myPatchiSelection}
            onSelect={setMyPatchiSelection}
            includeAll={!isHome}
            ariaLabel={`${UI.myPatchi.ta} ${UI.myPatchi.en}`}
          />
        </div>

        {activeSlot && (isHome || nextSlot) ? (
          <div className="context-row context-row--jamam-pair">
            <div className={isHome ? "jamam-pair jamam-pair--single" : "jamam-pair"}>
              {activeSlot ? (
                <div className="jamam-pair__cell">
                  <span className="context-label">
                    <BilingualText text={thozhilHeader(activeSlot.index)} block={false} />
                  </span>
                  {currentJamamActivity ? (
                    <button
                      type="button"
                      className="context-value-btn thozhil-value-btn jamam-summary__value"
                      aria-expanded={antharaDialogTarget === "current"}
                      onClick={() => setAntharaDialogTarget("current")}
                    >
                      <BilingualText
                        text={thozhilValueWithTime(
                          displayActivityBi(currentJamamActivity),
                          formatTimeRange(activeSlot.start, activeSlot.end),
                        )}
                        block={false}
                      />
                    </button>
                  ) : (
                    <span className="context-value jamam-summary__value">
                      <span className="jamam-summary__time">
                        {formatTimeRange(activeSlot.start, activeSlot.end)}
                      </span>
                    </span>
                  )}
                </div>
              ) : null}
              {!isHome && nextSlot ? (
                <div className="jamam-pair__cell">
                  <span className="context-label">
                    <BilingualText text={thozhilHeader(nextSlot.index)} block={false} />
                  </span>
                  {derivedNext.myPatchiActivity ? (
                    <button
                      type="button"
                      className="context-value-btn thozhil-value-btn jamam-summary__value"
                      aria-expanded={antharaDialogTarget === "next"}
                      onClick={() => setAntharaDialogTarget("next")}
                    >
                      <BilingualText
                        text={thozhilValueWithTime(
                          displayActivityBi(derivedNext.myPatchiActivity),
                          formatTimeRange(nextSlot.start, nextSlot.end),
                        )}
                        block={false}
                      />
                    </button>
                  ) : (
                    <span className="context-value jamam-summary__value">
                      <span className="jamam-summary__time">
                        {formatTimeRange(nextSlot.start, nextSlot.end)}
                      </span>
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

      </section>



      {!currentJamamActivity && (

        <section className="activity-card activity-card--empty">

          <p>

            <BilingualText text={UI.noDayData} />

          </p>

        </section>

      )}



      {antharaDialogProps ? (
        <JamamAntharaDialog
          open={antharaDialogTarget !== null}
          jamamSlot={antharaDialogProps.jamamSlot}
          getActivitySlots={antharaDialogProps.getActivitySlots}
          highlightPatchi={antharaDialogProps.highlightPatchi}
          highlightThozhil={antharaDialogProps.highlightThozhil}
          highlightSegmentIndex={antharaDialogProps.highlightSegmentIndex}
          onClose={() => setAntharaDialogTarget(null)}
          coords={coords}
          jamamSlots={jamam.slots}
          cycleStart={cycleStart}
          segmentCount={
            yamaFromJamamIndex(antharaDialogProps.jamamSlot.index).period === "night"
              ? ANTHARA_NIGHT_SEGMENT_COUNT
              : ANTHARA_DAY_SEGMENT_COUNT
          }
          matrixOptions={
            yamaFromJamamIndex(antharaDialogProps.jamamSlot.index).period === "day"
              ? { appendNightJamamRows: true, allJamamSlots: jamam.slots }
              : undefined
          }
        />
      ) : null}

    </div>

  );

}

