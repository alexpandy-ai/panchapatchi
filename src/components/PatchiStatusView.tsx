import { useEffect, useMemo, useState } from "react";

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
  jamamBilingual,
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
  ALTERNATE_ANTHARA_SEGMENT_COUNT,
  alternatePakshaSupportsNight,
  getAlternateJamamActivitySlots,
  getAlternatePaduPatchi,
  getAlternatePatchiJamamActivityForWeekday,
} from "../utils/alternateCalculation";

import { derivePatchiStatusFromSchedule } from "../utils/patchi";

import { getPakshaFromDate, type PakshaId } from "../utils/paksha";
import {
  getNextThithiPatchiEntryForDate,
  getThithiPatchiEntryForDate,
} from "../utils/thithi";

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

  /** Home-only chip selection; null = none highlighted by default. */
  const [homeChipSelection, setHomeChipSelection] = useState<(typeof PATCHI_ORDER)[number] | null>(
    null,
  );

  const [antharaDialogTarget, setAntharaDialogTarget] = useState<"current" | "next" | null>(
    null,
  );

  useEffect(() => {
    if (isHome && homeChipSelection == null) {
      setAntharaDialogTarget(null);
    }
  }, [homeChipSelection, isHome]);

  const weekday = selectedDateTime.getDay();
  const currentPakshaId = isHome ? getPakshaFromDate(selectedDateTime) : navigationPakshaId;
  const pakshaId = currentPakshaId;

  const thithiPatchiEntry = useMemo(
    () => getThithiPatchiEntryForDate(selectedDateTime, pakshaId),
    [selectedDateTime, pakshaId],
  );

  const thithiScheduleWeekday = thithiPatchiEntry.weekday;
  const athikaraPatchi = thithiPatchiEntry.patchi;

  const homePatchi = homeChipSelection ?? athikaraPatchi;
  const showHomeJamamValue = homeChipSelection != null;

  const myPatchi = isHome
    ? homePatchi
    : myPatchiSelection === "all"
      ? PATCHI_ORDER[0]
      : myPatchiSelection;

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
    if (!isHome || !homeChipSelection) return null;
    if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return null;
    return getAlternatePatchiJamamActivityForWeekday(
      pakshaId,
      thithiScheduleWeekday,
      jamam.yamaIndex,
      jamam.period,
      homeChipSelection,
    );
  }, [
    homeChipSelection,
    isHome,
    jamam.period,
    jamam.yamaIndex,
    pakshaId,
    thithiScheduleWeekday,
  ]);

  const paduPatchi = useMemo(() => {
    if (!isHome || (pakshaId !== "valarpirai" && pakshaId !== "theipirai")) return null;
    return getAlternatePaduPatchi(pakshaId, thithiScheduleWeekday);
  }, [isHome, pakshaId, thithiScheduleWeekday]);

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
      if (antharaDialogTarget !== "current" || !activeSlot || !homeChipSelection) return null;
      if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return null;

      const { period } = yamaFromJamamIndex(activeSlot.index);
      const supportsNight = alternatePakshaSupportsNight(pakshaId);
      const nextThithiMorning =
        period === "night" && supportsNight
          ? getNextThithiPatchiEntryForDate(selectedDateTime, pakshaId)
          : null;

      return {
        jamamSlot: activeSlot,
        getActivitySlots: (yama: number, slotPeriod: PeriodId) =>
          getAlternateJamamActivitySlots(pakshaId, thithiScheduleWeekday, yama, slotPeriod),
        highlightPatchi: homeChipSelection,
        highlightThozhil: homeJamamActivity ?? "—",
        highlightSegmentIndex: getAntharaSegmentIndex(
          activeSlot.start,
          activeSlot.end,
          selectedDateTime,
          ALTERNATE_ANTHARA_SEGMENT_COUNT,
        ),
        matrixOptions:
          period === "day" && supportsNight
            ? { appendNightJamamRows: true as const, allJamamSlots: jamam.slots }
            : period === "night" && nextThithiMorning != null
              ? {
                  appendNextDayMorningJamamRows: true as const,
                  getMorningJamamActivitySlots: (yama: number) =>
                    getAlternateJamamActivitySlots(
                      nextThithiMorning.pakshaId,
                      nextThithiMorning.weekday,
                      yama,
                      "day",
                    ),
                  getNextDayNightJamamActivitySlots: (yama: number) =>
                    getAlternateJamamActivitySlots(
                      nextThithiMorning.pakshaId,
                      nextThithiMorning.weekday,
                      yama,
                      "night",
                    ),
                }
              : undefined,
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
        matrixOptions: undefined,
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
        matrixOptions: undefined,
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
    homeChipSelection,
    isHome,
    jamam.period,
    jamam.slots,
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
              <span className="context-value context-value--home-day">
                <BilingualText text={thithiPatchiEntry.day} block={false} />
              </span>
            </div>

            <div className="context-row context-row--home-athikara">
              <span className="context-inline-item context-inline-item--athikara">
                <span className="context-label context-label--athikara">
                  <BilingualText text={UI.athikaraPatchi} block={false} />
                </span>
                <span className="context-value context-value--home-athikara">
                  <InlineEmojiLabel
                    text={patchiLabelBilingual(athikaraPatchi)}
                    emoji={patchiEmoji(athikaraPatchi)}
                  />
                </span>
              </span>
            </div>

            {paduPatchi ? (
              <div className="context-row context-row--home-padu">
                <span className="context-inline-item context-inline-item--padu">
                  <span className="context-label context-label--padu">
                    <BilingualText text={UI.paduPatchi} block={false} />
                  </span>
                  <span className="context-value context-value--home-padu">
                    <InlineEmojiLabel
                      text={patchiLabelBilingual(paduPatchi)}
                      emoji={patchiEmoji(paduPatchi)}
                    />
                  </span>
                </span>
              </div>
            ) : null}

            <div className="context-row context-row--home-chips">
              <PatchiFilterChips
                selected={homeChipSelection}
                onSelect={(patchi) => {
                  if (patchi === "all") {
                    setHomeChipSelection(null);
                    return;
                  }
                  setHomeChipSelection((current) => (current === patchi ? null : patchi));
                }}
                includeAll={false}
                hideEmoji
                ariaLabel={`${UI.myPatchi.ta} ${UI.myPatchi.en}`}
              />
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

        {!isHome ? (
          <div className="context-row context-row--patchi-filter">
            <span className="context-label">
              <BilingualText text={UI.myPatchi} block={false} />
            </span>
            <PatchiFilterChips
              selected={myPatchiSelection}
              onSelect={setMyPatchiSelection}
              includeAll
              ariaLabel={`${UI.myPatchi.ta} ${UI.myPatchi.en}`}
            />
          </div>
        ) : null}

        {activeSlot && (isHome || nextSlot) ? (
          <div className="context-row context-row--jamam-pair">
            <div className={isHome ? "jamam-pair jamam-pair--single" : "jamam-pair"}>
              {activeSlot ? (
                <div
                  className={[
                    "jamam-pair__cell",
                    isHome ? "jamam-pair__cell--home-inline" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="context-label">
                    <BilingualText
                      text={
                        isHome
                          ? jamamBilingual(activeSlot.index)
                          : thozhilHeader(activeSlot.index)
                      }
                      block={false}
                    />
                  </span>
                  {isHome ? (
                    showHomeJamamValue && currentJamamActivity ? (
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
                    ) : null
                  ) : currentJamamActivity ? (
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



      {!(isHome && !showHomeJamamValue) && !currentJamamActivity && (

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
            isHome
              ? ALTERNATE_ANTHARA_SEGMENT_COUNT
              : yamaFromJamamIndex(antharaDialogProps.jamamSlot.index).period === "night"
                ? ANTHARA_NIGHT_SEGMENT_COUNT
                : ANTHARA_DAY_SEGMENT_COUNT
          }
          matrixOptions={
            isHome
              ? antharaDialogProps.matrixOptions
              : yamaFromJamamIndex(antharaDialogProps.jamamSlot.index).period === "day"
                ? { appendNightJamamRows: true, allJamamSlots: jamam.slots }
                : undefined
          }
          onlyPatchi={isHome ? antharaDialogProps.highlightPatchi : undefined}
        />
      ) : null}

    </div>

  );

}

