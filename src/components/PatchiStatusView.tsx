import { useEffect, useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { NaalDialog } from "./NaalDialog";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import { PatchiFilterChips } from "./PatchiPickerBlock";
import type { NaalActivitySelection } from "./JamamSegmentsPanel";

import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";

import type { PakshaData } from "../types";

import {
  ANTHARA_DAY_SEGMENT_COUNT,
  ANTHARA_NIGHT_SEGMENT_COUNT,
  antharaSegmentWindow,
  antharaColumnJamamIndex,
  getAntharaSegmentIndex,
  getPatchiAntharaMatrix,
  JAMAM_ANTHARA_SEGMENT_COUNT,
  nightJamamIndicesRotatedFromYama,
  yamasRotatedFrom,
  clickedPeriodJamamSerials,
  type PatchiAntharaColumn,
  type PatchiAntharaMatrixOptions,
} from "../utils/anthara";

import { displayActivity, displayActivityBi } from "../utils/activityLabel";

import {

  PAKSHA_BI,

  PATCHI_ORDER,
  jamamBilingual,
  patchiBaseName,
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
  getAlternateJamamActivitySlotsForThithi,
  getAlternatePaduPatchiForJamam,
  getAlternatePatchiJamamActivityForWeekday,
  getDayEatingPatchiOnThithiBracketDay,
  getPatchiDaysDayForAthikaraPatchi,
  getPatchiDaysWeekdayForAthikaraPatchi,
} from "../utils/alternateCalculation";

import { derivePatchiStatusFromSchedule } from "../utils/patchi";

import { getPakshaFromDate, type PakshaId } from "../utils/paksha";
import {
  getNightThithiPatchiEntryForDate,
  getThithiPatchiEntryForDate,
  logAntharaThithiDebug,
  resolveNextMorningThithiContext,
} from "../utils/thithi";

interface PatchiStatusViewProps {
  selectedDateTime: Date;
  /** Excel sheet data — required for Status; unused on Home (Alternate Day Scheduler). */
  data?: Record<PakshaId, PakshaData | null>;
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
  const [homeNaalSelection, setHomeNaalSelection] = useState<NaalActivitySelection | null>(
    null,
  );

  useEffect(() => {
    if (isHome && homeChipSelection == null) {
      setAntharaDialogTarget(null);
      setHomeNaalSelection(null);
    }
  }, [homeChipSelection, isHome]);

  const weekday = selectedDateTime.getDay();

  /** Home: Night Thithi + pirai at sunset drive all alternate lookups. */
  const nightThithiEntry = useMemo(
    () => (isHome ? getNightThithiPatchiEntryForDate(selectedDateTime, coords) : null),
    [isHome, selectedDateTime, coords],
  );

  const currentPakshaId = isHome
    ? (nightThithiEntry?.pakshaId ?? getPakshaFromDate(selectedDateTime))
    : navigationPakshaId;
  const pakshaId = currentPakshaId;

  const thithiPatchiEntry = useMemo(() => {
    if (isHome && nightThithiEntry) return nightThithiEntry;
    return getThithiPatchiEntryForDate(selectedDateTime, pakshaId);
  }, [isHome, nightThithiEntry, selectedDateTime, pakshaId]);

  /**
   * Home Athikara: bird Eating on the Thithi Patchi bracket day (Day Scheduler
   * jamam-1 morning Eat). Status keeps the Thithi table bird.
   */
  const athikaraPatchi = useMemo(() => {
    const tablePatchi = thithiPatchiEntry.patchi;
    if (isHome && (pakshaId === "valarpirai" || pakshaId === "theipirai")) {
      return getDayEatingPatchiOnThithiBracketDay(pakshaId, tablePatchi) ?? tablePatchi;
    }
    return tablePatchi;
  }, [isHome, pakshaId, thithiPatchiEntry.patchi]);

  /**
   * Home schedule column: Patchi Days weekday for that Athikara under current pirai
   * (Information → Patchi Days). Status keeps Thithi planet weekday for Excel groups.
   */
  const thithiScheduleWeekday = useMemo(() => {
    if (
      isHome &&
      (pakshaId === "valarpirai" || pakshaId === "theipirai")
    ) {
      const fromPatchiDays = getPatchiDaysWeekdayForAthikaraPatchi(
        pakshaId,
        athikaraPatchi,
      );
      if (fromPatchiDays !== null) return fromPatchiDays;
    }
    return thithiPatchiEntry.weekday;
  }, [athikaraPatchi, isHome, pakshaId, thithiPatchiEntry.weekday]);

  /** Home: day next to Pirai — Patchi Days row for Athikara under current pirai. */
  const athikaraPatchiDay = useMemo(() => {
    if (!isHome || (pakshaId !== "valarpirai" && pakshaId !== "theipirai")) return null;
    return getPatchiDaysDayForAthikaraPatchi(pakshaId, athikaraPatchi);
  }, [athikaraPatchi, isHome, pakshaId]);

  /**
   * Home jamam / anthara / naal column: Day Scheduler weekday in brackets
   * under Athikara Patchi for the current Night Thithi.
   */
  const homeScheduleWeekday = thithiPatchiEntry.athikaraWeekday ?? thithiScheduleWeekday;

  const homePatchi = homeChipSelection ?? athikaraPatchi;
  const showHomeJamamValue = homeChipSelection != null;

  const myPatchi = isHome
    ? homePatchi
    : myPatchiSelection === "all"
      ? PATCHI_ORDER[0]
      : myPatchiSelection;

  const paksha = !isHome && data ? data[pakshaId] : null;

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
    if (isHome || !paksha) {
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
  }, [isHome, paksha, weekday, athikaraPatchi, myPatchi, jamam.yamaIndex, jamam.period]);

  const homeJamamActivity = useMemo(() => {
    if (!isHome || !homeChipSelection) return null;
    if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return null;
    return getAlternatePatchiJamamActivityForWeekday(
      pakshaId,
      homeScheduleWeekday,
      jamam.yamaIndex,
      jamam.period,
      homeChipSelection,
    );
  }, [
    homeChipSelection,
    homeScheduleWeekday,
    isHome,
    jamam.period,
    jamam.yamaIndex,
    pakshaId,
  ]);

  /** Home: Padu = Die bird in jamam 1 day for Athikara’s Patchi Days weekday. */
  const paduPatchi = useMemo(() => {
    if (!isHome || (pakshaId !== "valarpirai" && pakshaId !== "theipirai")) return null;
    return getAlternatePaduPatchiForJamam(pakshaId, thithiScheduleWeekday, 1, "day");
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

  const homeGetActivitySlots = useMemo(() => {
    if (!isHome || (pakshaId !== "valarpirai" && pakshaId !== "theipirai")) {
      return null;
    }
    return (yama: number, slotPeriod: PeriodId) =>
      getAlternateJamamActivitySlots(pakshaId, homeScheduleWeekday, yama, slotPeriod);
  }, [homeScheduleWeekday, isHome, pakshaId]);

  const homeAntharaMatrixOptions = useMemo((): PatchiAntharaMatrixOptions | undefined => {
    if (!isHome || !activeSlot || !homeGetActivitySlots) return undefined;

    const { period } = yamaFromJamamIndex(activeSlot.index);
    const supportsNight = alternatePakshaSupportsNight(pakshaId);

    if (period === "day" && supportsNight) {
      return {
        appendNightJamamRows: true,
        allJamamSlots: jamam.slots,
      };
    }
    if (period === "night" && supportsNight) {
      const nextMorningContext = resolveNextMorningThithiContext(activeSlot.start, coords);
      const nextThithiMorning = nextMorningContext.nextMorningThithi;
      return {
        appendNextDayMorningJamamRows: true,
        getMorningJamamActivitySlots: (yama: number) =>
          getAlternateJamamActivitySlotsForThithi(nextThithiMorning, yama, "day"),
        getNextDayNightJamamActivitySlots: (yama: number) =>
          getAlternateJamamActivitySlotsForThithi(nextThithiMorning, yama, "night"),
        nextMorningThithiContext: nextMorningContext,
      };
    }
    return undefined;
  }, [
    activeSlot,
    coords,
    homeGetActivitySlots,
    isHome,
    jamam.slots,
    pakshaId,
  ]);

  /**
   * Home Antharam: current of 10 equal jamam slices (same times as the Home dialog rows).
   */
  const homeAntharaCurrent = useMemo(() => {
    if (!isHome || !activeSlot || !homeChipSelection || !homeGetActivitySlots) return null;

    const matrix = getPatchiAntharaMatrix(
      activeSlot.start,
      activeSlot.end,
      homeGetActivitySlots,
      activeSlot.index,
      ALTERNATE_ANTHARA_SEGMENT_COUNT,
      homeAntharaMatrixOptions,
    );
    const segmentIndex = getAntharaSegmentIndex(
      activeSlot.start,
      activeSlot.end,
      selectedDateTime,
      ALTERNATE_ANTHARA_SEGMENT_COUNT,
    );
    const patchi = patchiBaseName(homeChipSelection);
    const row = matrix.rows.find((entry) => entry.patchi === patchi);
    const activity = row?.activities[segmentIndex] ?? "—";
    const column = matrix.columns[segmentIndex];
    if (!column) return null;

    const { start, end } = antharaSegmentWindow(
      matrix.columns,
      segmentIndex,
      activeSlot.end,
    );

    return {
      index: segmentIndex + 1,
      bird: patchi || homeChipSelection,
      activity,
      start,
      end,
      column,
    };
  }, [
    isHome,
    activeSlot,
    homeChipSelection,
    homeGetActivitySlots,
    homeAntharaMatrixOptions,
    selectedDateTime,
  ]);

  const antharaDialogProps = useMemo(() => {
    if (isHome) {
      if (antharaDialogTarget !== "current" || !activeSlot || !homeChipSelection) return null;
      if (!homeGetActivitySlots) return null;

      return {
        jamamSlot: activeSlot,
        getActivitySlots: homeGetActivitySlots,
        highlightPatchi: homeChipSelection,
        highlightThozhil: homeJamamActivity ?? "—",
        highlightSegmentIndex: homeAntharaCurrent ? homeAntharaCurrent.index - 1 : 0,
        matrixOptions: homeAntharaMatrixOptions,
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
    antharaDialogTarget,
    antharaGroup,
    derived.myPatchiActivity,
    derivedNext.myPatchiActivity,
    homeAntharaCurrent,
    homeAntharaMatrixOptions,
    homeGetActivitySlots,
    homeJamamActivity,
    homeChipSelection,
    isHome,
    jamam.period,
    myPatchi,
    nextSlot,
    selectedDateTime,
  ]);

  const currentJamamActivity = isHome ? homeJamamActivity : derived.myPatchiActivity;

  const openHomeNaalFromAntharam = () => {
    if (!activeSlot || !homeChipSelection || !homeAntharaCurrent) return;
    if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return;

    const { period: jamamPeriod } = yamaFromJamamIndex(activeSlot.index);
    const column: PatchiAntharaColumn = homeAntharaCurrent.column;
    const rowJamamIndex = antharaColumnJamamIndex(column, activeSlot.index);
    const { yama: rowYama } = yamaFromJamamIndex(rowJamamIndex);
    const isAppendedMorning = column.appendedMorning === true;
    const isAppendedNightJamam = column.jamamIndex != null && !isAppendedMorning;
    const period = isAppendedMorning
      ? "day"
      : isAppendedNightJamam
        ? "night"
        : jamamPeriod;
    const activity = displayActivity(homeAntharaCurrent.activity);
    const selection: NaalActivitySelection = {
      segmentStart: homeAntharaCurrent.start,
      segmentEnd: homeAntharaCurrent.end,
      antharaSerial: homeAntharaCurrent.index,
      patchi: homeChipSelection,
      activity,
      birdRows: [{ patchi: homeChipSelection, activity }],
      period,
      repeatActivity: false,
      antharaJamamSerials: clickedPeriodJamamSerials(rowJamamIndex),
    };

    const supportsNight = alternatePakshaSupportsNight(pakshaId);
    const appendNextDayMorning =
      jamamPeriod === "night" && !isAppendedMorning && supportsNight;
    const appendNextDayNight = isAppendedMorning && supportsNight;
    const appendNightJamam =
      jamamPeriod === "day" &&
      !isAppendedMorning &&
      !isAppendedNightJamam &&
      supportsNight;

    if (appendNightJamam) {
      const nightYamaOrder = yamasRotatedFrom(rowYama);
      selection.appendNightJamam = true;
      selection.appendedJamamSerials = nightJamamIndicesRotatedFromYama(rowYama);
      selection.nightJamamByBird = [
        {
          patchi: homeChipSelection,
          activities: nightYamaOrder.map((yama) => {
            const slots = getAlternateJamamActivitySlots(
              pakshaId,
              homeScheduleWeekday,
              yama,
              "night",
            );
            const match = slots.find(
              (entry) => patchiBaseName(entry.bird) === homeChipSelection,
            );
            return match ? displayActivity(match.activity) : "—";
          }),
        },
      ];
    } else if (appendNextDayMorning) {
      const nextThithiMorning = resolveNextMorningThithiContext(
        activeSlot.start,
        coords,
      ).nextMorningThithi;
      const morningYamaOrder = yamasRotatedFrom(rowYama);
      selection.appendNextDayMorning = true;
      selection.appendedJamamSerials = morningYamaOrder;
      selection.nextDayMorningByBird = [
        {
          patchi: homeChipSelection,
          activities: morningYamaOrder.map((yama) => {
            const slots = getAlternateJamamActivitySlotsForThithi(
              nextThithiMorning,
              yama,
              "day",
            );
            const match = slots.find(
              (entry) => patchiBaseName(entry.bird) === homeChipSelection,
            );
            return match ? displayActivity(match.activity) : "—";
          }),
        },
      ];
    } else if (appendNextDayNight) {
      const nextThithiMorning = resolveNextMorningThithiContext(
        activeSlot.start,
        coords,
      ).nextMorningThithi;
      const nightYamaOrder = yamasRotatedFrom(rowYama);
      selection.appendNextDayNight = true;
      selection.appendedJamamSerials = nightJamamIndicesRotatedFromYama(rowYama);
      selection.nextDayNightByBird = [
        {
          patchi: homeChipSelection,
          activities: nightYamaOrder.map((yama) => {
            const slots = getAlternateJamamActivitySlotsForThithi(
              nextThithiMorning,
              yama,
              "night",
            );
            const match = slots.find(
              (entry) => patchiBaseName(entry.bird) === homeChipSelection,
            );
            return match ? displayActivity(match.activity) : "—";
          }),
        },
      ];
    }

    if (appendNextDayMorning || appendNextDayNight) {
      const nextMorning = resolveNextMorningThithiContext(activeSlot.start, coords);
      logAntharaThithiDebug({
        selectedJamamType: appendNextDayNight ? "day" : "night",
        originalDate: nextMorning.originalDate,
        originalThithi: nextMorning.originalThithi,
        nextMorningDate: nextMorning.nextMorningDate,
        nextMorningThithi: nextMorning.nextMorningThithi,
        finalActivity: activity,
      });
    }

    setHomeNaalSelection(selection);
  };

  if (!isHome && !paksha) {
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
          <div className="context-row context-row--home-main">
            <div className="context-row--home-chips">
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

            <div className="context-row--home-details">
              <div className="context-row context-row--home-thithi">
                <span className="context-inline-item">
                  <span className="context-label">
                    <BilingualText text={UI.nightThithi} block={false} />
                  </span>
                  <span className="context-value context-value--home-thithi-name">
                    <BilingualText text={thithiPatchiEntry.thithi} block={false} />
                  </span>
                </span>
              </div>
              <div className="context-row context-row--home-day">
                <span className="context-value context-value--home-pirai">
                  <BilingualText text={PAKSHA_BI[currentPakshaId]} block={false} />
                </span>
                <span className="context-value context-value--home-day">
                  <BilingualText
                    text={athikaraPatchiDay ?? thithiPatchiEntry.day}
                    block={false}
                  />
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
                      emojiPosition="after"
                    />
                  </span>
                </span>
              </div>

              <div className="context-row context-row--home-naal">
                <span className="context-inline-item context-inline-item--naal">
                  <span className="context-label context-label--naal">
                    <BilingualText text={UI.thithiDay} block={false} />
                  </span>
                  <span className="context-value context-value--home-naal">
                    <BilingualText text={thithiPatchiEntry.day} block={false} />
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
                        emojiPosition="after"
                      />
                    </span>
                  </span>
                </div>
              ) : null}

              {activeSlot ? (
                <div className="context-row context-row--jamam-pair">
                  <div className="jamam-pair jamam-pair--single">
                    <div className="jamam-pair__cell jamam-pair__cell--home-stack">
                      <div className="jamam-pair__cell--home-jamam">
                        <span className="context-label">
                          <BilingualText text={jamamBilingual(activeSlot.index)} block={false} />
                        </span>
                        {showHomeJamamValue && currentJamamActivity ? (
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
                        ) : null}
                      </div>
                      {showHomeJamamValue && homeAntharaCurrent ? (
                        <div className="jamam-pair__cell--home-jamam jamam-pair__cell--home-antharam">
                          <span className="context-label context-label--antharam">
                            <BilingualText text={UI.antharaJamam} block={false} />
                          </span>
                          <button
                            type="button"
                            className="context-value-btn thozhil-value-btn jamam-summary__value context-value--home-antharam"
                            aria-expanded={homeNaalSelection !== null}
                            onClick={openHomeNaalFromAntharam}
                          >
                            <BilingualText
                              text={thozhilValueWithTime(
                                displayActivityBi(homeAntharaCurrent.activity),
                                formatTimeRange(
                                  homeAntharaCurrent.start,
                                  homeAntharaCurrent.end,
                                ),
                              )}
                              block={false}
                            />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
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

        {!isHome && activeSlot && nextSlot ? (
          <div className="context-row context-row--jamam-pair">
            <div className="jamam-pair">
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
              {nextSlot ? (
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
          homeLayout={isHome}
        />
      ) : null}

      {homeNaalSelection ? (
        <NaalDialog
          open
          segmentStart={homeNaalSelection.segmentStart}
          segmentEnd={homeNaalSelection.segmentEnd}
          antharaSerial={homeNaalSelection.antharaSerial}
          patchi={homeNaalSelection.patchi}
          activity={homeNaalSelection.activity}
          birdRows={homeNaalSelection.birdRows}
          period={homeNaalSelection.period}
          repeatActivity={homeNaalSelection.repeatActivity}
          appendNextDayMorning={homeNaalSelection.appendNextDayMorning}
          nextDayMorningByBird={homeNaalSelection.nextDayMorningByBird}
          appendNextDayNight={homeNaalSelection.appendNextDayNight}
          nextDayNightByBird={homeNaalSelection.nextDayNightByBird}
          appendNightJamam={homeNaalSelection.appendNightJamam}
          nightJamamByBird={homeNaalSelection.nightJamamByBird}
          appendedJamamSerials={homeNaalSelection.appendedJamamSerials}
          antharaJamamSerials={homeNaalSelection.antharaJamamSerials}
          homeLayout
          onClose={() => setHomeNaalSelection(null)}
        />
      ) : null}

    </div>

  );

}

