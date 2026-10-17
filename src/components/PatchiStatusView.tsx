import { useEffect, useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { NaalDialog } from "./NaalDialog";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import { PatchiFilterChips } from "./PatchiPickerBlock";
import type { NaalActivitySelection } from "./JamamSegmentsPanel";

import { useLanguage } from "../context/LanguageContext";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";

import type { PakshaData } from "../types";

import {
  ANTHARA_DAY_SEGMENT_COUNT,
  ANTHARA_NIGHT_SEGMENT_COUNT,
  getAntharaSegmentIndex,
  JAMAM_ANTHARA_SEGMENT_COUNT,
  resolveNaalAppendForAntharaClick,
  type PatchiAntharaColumn,
} from "../utils/anthara";

import { displayActivity, displayActivityBi } from "../utils/activityLabel";

import {

  PAKSHA_BI,

  PATCHI_ORDER,
  jamamBilingual,
  patchiBaseName,
  patchiEmoji,
  patchiLabelBilingual,
  pickBilingual,
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
  getAlternateJamamActivitySlotsForThithi,
  getAlternatePaduPatchiForJamam,
  getDayEatingPatchiOnThithiBracketDay,
  getPatchiDaysWeekdayForAthikaraPatchi,
} from "../utils/alternateCalculation";

import { derivePatchiStatusFromSchedule } from "../utils/patchi";

import { LOCATION_DISPLAY, type GeoCoords } from "../utils/location";
import type { PakshaId } from "../utils/paksha";
import {
  getThithiPatchiEntryForDate,
  getThithiPatchiEntryForThithiNumber,
  logAntharaThithiDebug,
  resolveNextMorningThithiContext,
} from "../utils/thithi";
import { THITHI_SCHEDULE_MISS, thithiScheduleBirdNow } from "../utils/thithiSchedule";

import {
  outOfRangeText,
  PIRAI_NAMES,
  reviewReasonText,
  TD,
  UNNAMED_SECTOR,
} from "../thithiCalendar/labels";
import { useDailyThithi } from "../thithiCalendar/useDailyThithi";
import "../thithiCalendar/thithiCalendar.css";

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

  const { language } = useLanguage();
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

  /** Home: the shared daily thithi (same calculation as Thithi Details) drives Pirai/Thithi and all lookups. */
  const { daily } = useDailyThithi(selectedDateTime, isHome);
  const calculatedSelection = daily?.status === "ready" ? daily.selection : null;
  const calculatedPakshaId = calculatedSelection?.pakshaId ?? null;
  const calculatedThithiNumber = calculatedSelection?.thithiNumber ?? null;
  const calculatedThithiEntry = useMemo(
    () =>
      calculatedPakshaId && calculatedThithiNumber !== null
        ? getThithiPatchiEntryForThithiNumber(calculatedPakshaId, calculatedThithiNumber)
        : null,
    [calculatedPakshaId, calculatedThithiNumber],
  );

  /**
   * Home Pirai/Thithi override, tied to the date/time and location it was chosen for.
   * A submitted date, time or location (or a reload) restores the calculated values;
   * a language change keeps it.
   */
  const [homeThithiOverride, setHomeThithiOverride] = useState<{
    pakshaId: PakshaId;
    thithiNumber: number;
    dateTime: Date;
    coords: GeoCoords | null;
  } | null>(null);
  const activeThithiOverride =
    homeThithiOverride &&
    homeThithiOverride.dateTime === selectedDateTime &&
    homeThithiOverride.coords === coords
      ? homeThithiOverride
      : null;

  const selectHomePiraiThithi = (pakshaId: PakshaId, thithiNumber: number) => {
    if (
      calculatedThithiEntry &&
      calculatedThithiEntry.pakshaId === pakshaId &&
      calculatedThithiEntry.thithiNumber === thithiNumber
    ) {
      setHomeThithiOverride(null);
      return;
    }
    setHomeThithiOverride({ pakshaId, thithiNumber, dateTime: selectedDateTime, coords });
  };

  /** Selected row when the user overrides; otherwise the shared calculated thithi. */
  const homeNightThithi = useMemo(() => {
    if (!isHome) return null;
    if (activeThithiOverride) {
      return getThithiPatchiEntryForThithiNumber(
        activeThithiOverride.pakshaId,
        activeThithiOverride.thithiNumber,
      );
    }
    return calculatedThithiEntry;
  }, [activeThithiOverride, calculatedThithiEntry, isHome]);

  /** Pending, unnamed sector, out of range or error: no thithi is assigned; Thithi Details shows the same state. */
  const homeThithiUnresolved = isHome && homeNightThithi === null;
  const homeUnresolvedLabel =
    daily?.status === "locating"
      ? LOCATION_DISPLAY.detecting
      : daily?.status === "unnamed"
        ? UNNAMED_SECTOR
        : daily?.status === "outOfRange"
          ? TD.outOfRangeShort
          : daily?.status === "error"
            ? TD.calculationFailed
            : TD.computing;
  /** Placeholder used only for hidden lookups while unresolved; never displayed as the thithi. */
  const homePlaceholderPakshaId: PakshaId =
    daily?.status === "unnamed" ? daily.adjacentPirai : "valarpirai";

  const currentPakshaId = isHome
    ? (homeNightThithi?.pakshaId ?? homePlaceholderPakshaId)
    : navigationPakshaId;
  const pakshaId = currentPakshaId;

  const thithiPatchiEntry = useMemo(() => {
    if (isHome) return homeNightThithi ?? getThithiPatchiEntryForThithiNumber(pakshaId, 15);
    return getThithiPatchiEntryForDate(selectedDateTime, pakshaId);
  }, [isHome, homeNightThithi, selectedDateTime, pakshaId]);

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

  /** Home chip: the clicked bird on Thithi Schedule → Schedule for the Pirai / Thithi in the dropdowns. */
  const homeChipSchedule = useMemo(() => {
    if (!isHome || !homeChipSelection || !homeNightThithi) return null;
    return thithiScheduleBirdNow({
      pakshaId: homeNightThithi.pakshaId,
      thithiNumber: homeNightThithi.thithiNumber,
      bird: homeChipSelection,
      moment: selectedDateTime,
      coords,
      nightThithi: homeNightThithi,
    });
  }, [coords, homeChipSelection, homeNightThithi, isHome, selectedDateTime]);
  const homeChipOk = homeChipSchedule?.status === "ok" ? homeChipSchedule : null;
  const homeJamamActivity = homeChipOk?.jamamActivity ?? null;
  const homeJamamMiss =
    homeChipSchedule?.status === "noScheduleRow"
      ? THITHI_SCHEDULE_MISS.noScheduleRow
      : homeChipOk && !homeChipOk.jamamActivity
        ? THITHI_SCHEDULE_MISS.noJamamActivity
        : null;

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

  const homeGetActivitySlots = homeChipOk?.antharaClick.getActivitySlots ?? null;
  const homeAntharaMatrixOptions = homeChipOk?.antharaClick.matrixOptions;
  const homeJamamSlot = homeChipOk?.jamamSlot ?? null;

  /** Home Antharam: the clicked bird's current slice of the Thithi Schedule antharam table. */
  const homeAntharaCurrent = useMemo(() => {
    const antharam = homeChipOk?.antharam;
    return antharam?.activity ? { ...antharam, activity: antharam.activity } : null;
  }, [homeChipOk]);
  const homeAntharaMiss =
    homeChipOk && homeChipOk.jamamActivity && !homeAntharaCurrent
      ? THITHI_SCHEDULE_MISS.noAntharaActivity
      : null;

  const antharaDialogProps = useMemo(() => {
    if (isHome) {
      if (antharaDialogTarget !== "current" || !homeJamamSlot || !homeChipSelection) return null;
      if (!homeGetActivitySlots) return null;

      return {
        jamamSlot: homeJamamSlot,
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
    homeJamamSlot,
    homeChipSelection,
    isHome,
    jamam.period,
    myPatchi,
    nextSlot,
    selectedDateTime,
  ]);

  const currentJamamActivity = isHome
    ? (homeThithiUnresolved ? null : homeJamamActivity)
    : derived.myPatchiActivity;

  const openHomeNaalFromAntharam = () => {
    if (!homeJamamSlot || !homeChipSelection || !homeAntharaCurrent || !homeGetActivitySlots) return;
    if (pakshaId !== "valarpirai" && pakshaId !== "theipirai") return;

    const column: PatchiAntharaColumn = homeAntharaCurrent.column;
    const activity = displayActivity(homeAntharaCurrent.activity);
    const supportsNight = alternatePakshaSupportsNight(pakshaId);
    const naalAppend = resolveNaalAppendForAntharaClick({
      parentJamamIndex: homeJamamSlot.index,
      column,
      canAppendNextMorning: supportsNight,
      canAppendNextDayNight: supportsNight,
      canAppendSameDayNight: supportsNight,
    });
    const selection: NaalActivitySelection = {
      segmentStart: homeAntharaCurrent.start,
      segmentEnd: homeAntharaCurrent.end,
      antharaSerial: homeAntharaCurrent.index,
      patchi: homeChipSelection,
      activity,
      birdRows: [{ patchi: homeChipSelection, activity }],
      period: naalAppend.period,
      repeatActivity: false,
      antharaJamamSerials: naalAppend.antharaJamamSerials,
    };

    const { appendNextDayMorning, appendNextDayNight, appendNightJamam } = naalAppend;

    if (appendNightJamam) {
      selection.appendNightJamam = true;
      selection.appendedJamamSerials = naalAppend.appendedJamamSerials;
      selection.nightJamamByBird = [
        {
          patchi: homeChipSelection,
          activities: naalAppend.nightYamaOrder.map((yama) => {
            const slots = homeGetActivitySlots(yama, "night");
            const match = slots.find(
              (entry) => patchiBaseName(entry.bird) === homeChipSelection,
            );
            return match ? displayActivity(match.activity) : "—";
          }),
        },
      ];
    } else if (appendNextDayMorning) {
      const nextThithiMorning = resolveNextMorningThithiContext(
        homeJamamSlot.start,
        coords,
        homeNightThithi ?? undefined,
      ).nextMorningThithi;
      selection.appendNextDayMorning = true;
      selection.appendedJamamSerials = naalAppend.appendedJamamSerials;
      selection.nextDayMorningByBird = [
        {
          patchi: homeChipSelection,
          activities: naalAppend.morningYamaOrder.map((yama) => {
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
        homeJamamSlot.start,
        coords,
        homeNightThithi ?? undefined,
      ).nextMorningThithi;
      selection.appendNextDayNight = true;
      selection.appendedJamamSerials = naalAppend.appendedJamamSerials;
      selection.nextDayNightByBird = [
        {
          patchi: homeChipSelection,
          activities: naalAppend.nightYamaOrder.map((yama) => {
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
      const nextMorning = resolveNextMorningThithiContext(
        homeJamamSlot.start,
        coords,
        homeNightThithi ?? undefined,
      );
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
          <div className="home-patchi">
            <div className="home-patchi__chips">
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

            <div className="home-patchi__details">
              <div className="home-pirai-thithi-row">
                <div className="home-pirai-thithi-row__field">
                  <label className="visually-hidden" htmlFor="home-pirai-select">
                    <BilingualText text={UI.pirai} block={false} />
                  </label>
                  <select
                    id="home-pirai-select"
                    className="home-field-select"
                    value={homeThithiUnresolved ? "" : currentPakshaId}
                    onChange={(event) => {
                      const nextPaksha = event.target.value;
                      if (nextPaksha !== "valarpirai" && nextPaksha !== "theipirai") return;
                      selectHomePiraiThithi(nextPaksha, thithiPatchiEntry.thithiNumber);
                    }}
                  >
                    {homeThithiUnresolved ? (
                      <option value="" disabled>
                        {pickBilingual(homeUnresolvedLabel, language)}
                      </option>
                    ) : null}
                    <option value="valarpirai">
                      {pickBilingual(PIRAI_NAMES.valarpirai, language)}
                    </option>
                    <option value="theipirai">
                      {pickBilingual(PIRAI_NAMES.theipirai, language)}
                    </option>
                  </select>
                </div>
                <div className="home-pirai-thithi-row__field">
                  <label className="visually-hidden" htmlFor="home-thithi-select">
                    <BilingualText text={UI.thithi} block={false} />
                  </label>
                  <select
                    id="home-thithi-select"
                    className="home-field-select"
                    value={homeThithiUnresolved ? "" : thithiPatchiEntry.thithiNumber}
                    onChange={(event) => {
                      if (currentPakshaId !== "valarpirai" && currentPakshaId !== "theipirai") {
                        return;
                      }
                      selectHomePiraiThithi(currentPakshaId, Number(event.target.value));
                    }}
                  >
                    {homeThithiUnresolved ? (
                      <option value="" disabled>
                        {pickBilingual(homeUnresolvedLabel, language)}
                      </option>
                    ) : null}
                    {Array.from({ length: 15 }, (_, index) => {
                      const thithiNumber = index + 1;
                      const optionPaksha =
                        currentPakshaId === "theipirai" ? "theipirai" : "valarpirai";
                      const label = getThithiPatchiEntryForThithiNumber(
                        optionPaksha,
                        thithiNumber,
                      ).thithi;
                      return (
                        <option key={thithiNumber} value={thithiNumber}>
                          {pickBilingual(label, language)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {homeThithiUnresolved ? (
                daily?.status === "unnamed" ||
                daily?.status === "outOfRange" ||
                daily?.status === "error" ? (
                  <div className="thithi-calendar__review" role="status">
                    <strong>
                      {daily.status === "unnamed"
                        ? `${pickBilingual(TD.reviewDate, language)} · ${pickBilingual(UNNAMED_SECTOR, language)}`
                        : daily.status === "outOfRange"
                          ? outOfRangeText(daily.effective.effectiveDateKey, language)
                          : pickBilingual(TD.calculationFailed, language)}
                    </strong>
                    {daily.status === "unnamed" ? (
                      <ul>
                        {daily.day.reasons.map((reason, index) => (
                          <li key={`${reason.code}-${index}`}>{reviewReasonText(reason, language)}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p>{pickBilingual(TD.homeReviewHint, language)}</p>
                  </div>
                ) : null
              ) : (
              <dl className="home-patchi__facts">
                <div className="home-patchi__fact">
                  <dt className="context-label">
                    <BilingualText text={UI.athikaraPatchi} block={false} />
                  </dt>
                  <dd className="context-value context-value--home-athikara">
                    <InlineEmojiLabel
                      text={patchiLabelBilingual(athikaraPatchi)}
                      emoji={patchiEmoji(athikaraPatchi)}
                      emojiPosition="after"
                    />
                  </dd>
                </div>

                <div className="home-patchi__fact">
                  <dt className="context-label">
                    <BilingualText text={UI.thithiDay} block={false} />
                  </dt>
                  <dd className="context-value context-value--home-naal">
                    <BilingualText text={thithiPatchiEntry.day} block={false} />
                  </dd>
                </div>

                {paduPatchi ? (
                  <div className="home-patchi__fact">
                    <dt className="context-label">
                      <BilingualText text={UI.paduPatchi} block={false} />
                    </dt>
                    <dd className="context-value context-value--home-padu">
                      <InlineEmojiLabel
                        text={patchiLabelBilingual(paduPatchi)}
                        emoji={patchiEmoji(paduPatchi)}
                        emojiPosition="after"
                      />
                    </dd>
                  </div>
                ) : null}

                {activeSlot ? (
                  <div className="home-patchi__fact home-patchi__fact--control">
                    <dt className="context-label">
                      <BilingualText text={jamamBilingual(activeSlot.index)} block={false} />
                    </dt>
                    <dd className="home-patchi__control">
                      {showHomeJamamValue && currentJamamActivity && homeJamamSlot ? (
                        <button
                          type="button"
                          className="thozhil-value-btn home-patchi__dropdown"
                          aria-expanded={antharaDialogTarget === "current"}
                          onClick={() => setAntharaDialogTarget("current")}
                        >
                          <BilingualText
                            text={thozhilValueWithTime(
                              displayActivityBi(currentJamamActivity),
                              formatTimeRange(homeJamamSlot.start, homeJamamSlot.end),
                            )}
                            block={false}
                          />
                        </button>
                      ) : showHomeJamamValue && homeJamamMiss ? (
                        <span className="home-patchi__miss" role="status">
                          <BilingualText text={homeJamamMiss} block={false} />
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}

                {activeSlot && showHomeJamamValue && homeAntharaCurrent ? (
                  <div className="home-patchi__fact home-patchi__fact--control">
                    <dt className="context-label">
                      <BilingualText text={UI.antharaJamam} block={false} />
                    </dt>
                    <dd className="home-patchi__control">
                      <button
                        type="button"
                        className="thozhil-value-btn home-patchi__dropdown"
                        aria-expanded={homeNaalSelection !== null}
                        onClick={openHomeNaalFromAntharam}
                      >
                        <BilingualText
                          text={thozhilValueWithTime(
                            displayActivityBi(homeAntharaCurrent.activity),
                            formatTimeRange(homeAntharaCurrent.start, homeAntharaCurrent.end),
                          )}
                          block={false}
                        />
                      </button>
                    </dd>
                  </div>
                ) : null}

                {activeSlot && showHomeJamamValue && homeAntharaMiss ? (
                  <div className="home-patchi__fact home-patchi__fact--control">
                    <dt className="context-label">
                      <BilingualText text={UI.antharaJamam} block={false} />
                    </dt>
                    <dd className="home-patchi__control">
                      <span className="home-patchi__miss" role="status">
                        <BilingualText text={homeAntharaMiss} block={false} />
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
              )}
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



      {!(isHome && !showHomeJamamValue) && !homeThithiUnresolved && !currentJamamActivity && (

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

