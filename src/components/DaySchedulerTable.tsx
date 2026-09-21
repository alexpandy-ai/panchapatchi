import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { BilingualText } from "./BilingualText";
import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { PatchiFilterChips, type PatchiSelection } from "./PatchiPickerBlock";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";

import type { PeriodId } from "../utils/jamam";
import { jamamIndexForYama } from "../utils/jamam";
import {
  buildDaySchedulerJamamColumns,
  daySchedulerJamamSlots,
  type DaySchedulerJamamColumn,
} from "../utils/daySchedulerJamam";

import { displayActivityBi } from "../utils/activityLabel";

import { getPakshaGroupDayBilingual } from "../utils/dayGroup";

import {
  alternatePakshaSupportsNight,
  ALTERNATE_WEEKDAY_ORDER,
  getAlternateDayActivity,
  getAlternateDayBirdForActivity,
  getAlternateGroupKey,
  getAlternateNightActivity,
  getAlternateNightBirdForActivity,
  getAlternateJamamActivitySlots,
  getAlternateJamamActivitySlotsForThithi,
  ALTERNATE_ANTHARA_SEGMENT_COUNT,
  ALTERNATE_NIGHT_ACTIVITY_TA,
} from "../utils/alternateCalculation";

import {
  activityBilingual,
  jamamBilingual,
  PANCHA_ACTIVITY_TA,
  PATCHI_ORDER,
  patchiBilingual,
  PAKSHA_BI,
  periodAthikaraPatchiHeader,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import {
  getThithiPatchiEntryForDate,
  logAntharaThithiDebug,
  resolveNextMorningThithiContext,
} from "../utils/thithi";

const SHEET_TABS: { id: PakshaId; label: (typeof PAKSHA_BI)[PakshaId] }[] = [
  { id: "valarpirai", label: PAKSHA_BI.valarpirai },
  { id: "theipirai", label: PAKSHA_BI.theipirai },
];

type PatchiName = (typeof PATCHI_ORDER)[number];

interface DaySchedulerTableProps {
  selectedPatchi: PatchiSelection;
  onSelectPatchi: (patchi: PatchiSelection) => void;
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

interface AlternateAntharaSelection {
  weekday: number;
  yama: number;
  period: PeriodId;
  patchi: PatchiName;
  thozhil: string;
}

function isAlternateAntharaCellSelected(
  selection: AlternateAntharaSelection | null,
  weekday: number,
  yama: number,
  period: PeriodId,
  patchi: PatchiName,
  thozhil: string,
): boolean {
  if (!selection) return false;
  return (
    selection.weekday === weekday &&
    selection.yama === yama &&
    selection.period === period &&
    selection.patchi === patchi &&
    selection.thozhil === thozhil
  );
}

export function DaySchedulerTable({
  selectedPatchi,
  onSelectPatchi,
  selectedDateTime,
  subtitle,
}: DaySchedulerTableProps) {
  const { paksha: activePaksha, setPaksha: setActivePaksha } = useNavigation();
  const { coords } = useLocation();

  const jamamColumns = useMemo(
    () => buildDaySchedulerJamamColumns(selectedDateTime, coords),
    [selectedDateTime, coords],
  );

  const showAlternatePakshaTables =
    activePaksha === "valarpirai" || activePaksha === "theipirai";

  return (
    <section className="schedule-table-card schedule-table-card--alternate">
      {subtitle ? (
        <div className="patchi-schedule-head">
          <p className="patchi-schedule-head__meta">
            <BilingualText text={subtitle} />
          </p>
        </div>
      ) : null}
      <div
        className="sheet-picker patchi-schedule-sheet-picker"
        role="tablist"
        aria-label={`${UI.sheetPicker.ta} ${UI.sheetPicker.en}`}
      >
        {SHEET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={
              activePaksha === tab.id
                ? "sheet-picker__btn sheet-picker__btn--active"
                : "sheet-picker__btn"
            }
            onClick={() => setActivePaksha(tab.id)}
            aria-selected={activePaksha === tab.id}
          >
            <span className="sheet-picker__label">
              <BilingualText text={tab.label} />
            </span>
          </button>
        ))}
      </div>

      <PatchiFilterChips
        selected={selectedPatchi}
        onSelect={onSelectPatchi}
        ariaLabel={`${UI.selectOurPatchi.ta} ${UI.selectOurPatchi.en}`}
      />

      {showAlternatePakshaTables ? (
        <div className="patchi-pivot-tables">
          <AlternatePakshaScheduleView
            jamamColumns={jamamColumns}
            pakshaId={activePaksha}
            selectedPatchi={selectedPatchi}
            selectedDateTime={selectedDateTime}
          />
        </div>
      ) : null}
    </section>
  );
}

function AlternatePakshaScheduleView({
  jamamColumns,
  pakshaId,
  selectedPatchi,
  selectedDateTime,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  selectedPatchi: PatchiSelection;
  selectedDateTime?: Date;
}) {
  const { coords } = useLocation();
  const [antharaSelection, setAntharaSelection] = useState<AlternateAntharaSelection | null>(
    null,
  );

  const allJamamSlots = useMemo(
    () => daySchedulerJamamSlots(jamamColumns),
    [jamamColumns],
  );

  const jamamSlot = useMemo(() => {
    if (!antharaSelection) return null;
    const index = jamamIndexForYama(antharaSelection.yama, antharaSelection.period);
    return allJamamSlots.find((slot) => slot.index === index) ?? null;
  }, [allJamamSlots, antharaSelection]);

  const appendNightJamamRows =
    antharaSelection?.period === "day" && alternatePakshaSupportsNight(pakshaId);

  const nextMorningContext = useMemo(() => {
    if (antharaSelection?.period !== "night" || !jamamSlot) return null;
    return resolveNextMorningThithiContext(jamamSlot.start, coords);
  }, [antharaSelection?.period, coords, jamamSlot]);

  const nextThithiMorning = nextMorningContext?.nextMorningThithi ?? null;

  const appendNextDayMorningJamamRows =
    antharaSelection?.period === "night" &&
    alternatePakshaSupportsNight(pakshaId) &&
    nextThithiMorning != null;

  useEffect(() => {
    if (!antharaSelection || !jamamSlot) return;
    const originalDate = selectedDateTime ?? jamamSlot.start;
    if (antharaSelection.period === "day") {
      const originalThithi = getThithiPatchiEntryForDate(originalDate, pakshaId);
      logAntharaThithiDebug({
        selectedJamamType: "day",
        originalDate,
        originalThithi,
        nextMorningDate: null,
        nextMorningThithi: null,
        finalActivity: antharaSelection.thozhil,
      });
      return;
    }
    if (!nextMorningContext) return;
    logAntharaThithiDebug({
      selectedJamamType: "night",
      originalDate: nextMorningContext.originalDate,
      originalThithi: nextMorningContext.originalThithi,
      nextMorningDate: nextMorningContext.nextMorningDate,
      nextMorningThithi: nextMorningContext.nextMorningThithi,
      finalActivity: antharaSelection.thozhil,
    });
  }, [
    antharaSelection,
    jamamSlot,
    nextMorningContext,
    pakshaId,
    selectedDateTime,
  ]);

  return (
    <>
      {selectedPatchi === "all" ? (
        <AlternatePakshaDayNightTables
          jamamColumns={jamamColumns}
          pakshaId={pakshaId}
          antharaSelection={antharaSelection}
          onOpenAnthara={setAntharaSelection}
        />
      ) : (
        <AlternatePakshaSingleBirdTables
          jamamColumns={jamamColumns}
          pakshaId={pakshaId}
          bird={selectedPatchi}
          antharaSelection={antharaSelection}
          onOpenAnthara={setAntharaSelection}
        />
      )}
      {antharaSelection && jamamSlot ? (
        <JamamAntharaDialog
          open
          jamamSlot={jamamSlot}
          getActivitySlots={(yama, slotPeriod) =>
            getAlternateJamamActivitySlots(
              pakshaId,
              antharaSelection.weekday,
              yama,
              slotPeriod,
            )
          }
          highlightPatchi={antharaSelection.patchi}
          highlightThozhil={antharaSelection.thozhil}
          onClose={() => setAntharaSelection(null)}
          coords={coords}
          jamamSlots={allJamamSlots}
          segmentCount={ALTERNATE_ANTHARA_SEGMENT_COUNT}
          matrixOptions={
            appendNightJamamRows
              ? { appendNightJamamRows: true, allJamamSlots }
              : appendNextDayMorningJamamRows && nextThithiMorning != null
                ? {
                    appendNextDayMorningJamamRows: true,
                    getMorningJamamActivitySlots: (yama) =>
                      getAlternateJamamActivitySlotsForThithi(
                        nextThithiMorning,
                        yama,
                        "day",
                      ),
                    getNextDayNightJamamActivitySlots: (yama) =>
                      getAlternateJamamActivitySlotsForThithi(
                        nextThithiMorning,
                        yama,
                        "night",
                      ),
                    nextMorningThithiContext: nextMorningContext ?? undefined,
                  }
                : undefined
          }
        />
      ) : null}
    </>
  );
}

function AlternatePakshaDayNightTables({
  jamamColumns,
  pakshaId,
  antharaSelection,
  onOpenAnthara,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
}) {
  const showNight = alternatePakshaSupportsNight(pakshaId);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyHeadRef = useRef<HTMLTableSectionElement>(null);
  const [activeSection, setActiveSection] = useState<{
    weekday: number;
    period: PeriodId;
  }>({
    weekday: ALTERNATE_WEEKDAY_ORDER[0],
    period: "day",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateActiveSection = () => {
      const markers = Array.from(
        container.querySelectorAll<HTMLElement>("[data-alternate-section]"),
      );
      if (!markers.length) return;

      const stickyHead = stickyHeadRef.current;
      const anchorY = stickyHead
        ? stickyHead.getBoundingClientRect().bottom + 1
        : 96;

      let activeMarker = markers[0];

      for (const marker of markers) {
        if (marker.getBoundingClientRect().top <= anchorY) {
          activeMarker = marker;
        } else {
          break;
        }
      }

      const weekday = Number(activeMarker.dataset.weekday);
      const period = activeMarker.dataset.period as PeriodId | undefined;
      if (!weekday || !period) return;

      setActiveSection((previous) =>
        previous.weekday === weekday && previous.period === period
          ? previous
          : { weekday, period },
      );
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true, capture: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection, true);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [showNight, pakshaId]);

  return (
    <div ref={containerRef} className="patchi-pivot-section alternate-valarpirai-all-chip">
      <div className="sheet-table-wrap patchi-pivot-wrap">
        <table className="sheet-table patchi-pivot-table alternate-all-chip-table">
          <thead ref={stickyHeadRef} className="alternate-all-chip-table__sticky-head">
            <tr className="alternate-all-chip-table__jamam-row">
              <th className="patchi-pivot-table__day-col alternate-all-chip-table__activity-col">
                <BilingualText text={UI.patchiActivity} />
              </th>
              {jamamColumns.map((column) => (
                <th
                  key={`active-hdr-${column.yama}-${activeSection.period}`}
                  className="alternate-all-chip-table__jamam-header"
                >
                  <span className="patchi-pivot-table__jamam">
                    <BilingualText
                      text={jamamBilingual(
                        jamamIndexForYama(column.yama, activeSection.period),
                      )}
                    />
                  </span>
                  <span className="patchi-pivot-table__time">
                    {activeSection.period === "day"
                      ? column.dayTimeRange
                      : column.nightTimeRange}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALTERNATE_WEEKDAY_ORDER.map((weekday, weekdayIndex) => {
              const groupKey = getAlternateGroupKey(pakshaId, weekday);
              if (!groupKey) return null;

              const weekdayStartClass = [
                "alternate-all-chip-table__period-marker",
                weekdayIndex > 0 ? "alternate-all-chip-table__weekday-start--spaced" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Fragment key={groupKey}>
                  <tr
                    className={weekdayStartClass}
                    data-alternate-section
                    data-weekday={weekday}
                    data-period="day"
                  >
                    <th
                      scope="row"
                      className="alternate-all-chip-table__period-label alternate-valarpirai-day-table__activity"
                    >
                      <span className="alternate-all-chip-table__active-day">
                        <BilingualText text={getPakshaGroupDayBilingual(pakshaId, groupKey)} />
                      </span>
                      <span className="alternate-all-chip-table__header-sep" aria-hidden="true">
                        ·
                      </span>
                      <BilingualText text={periodAthikaraPatchiHeader("day").period} />
                    </th>
                    {jamamColumns.map((column) => (
                      <td
                        key={`day-spacer-${groupKey}-${column.yama}`}
                        className="alternate-all-chip-table__period-spacer"
                        aria-hidden="true"
                      />
                    ))}
                  </tr>
                  {PANCHA_ACTIVITY_TA.map((activityTa, activityIndex) => (
                    <tr key={`day-${groupKey}-${activityTa}`}>
                      <th
                        scope="row"
                        className="patchi-pivot-table__day alternate-valarpirai-day-table__activity"
                      >
                        <BilingualText text={activityBilingual(activityTa)} />
                      </th>
                      {jamamColumns.map((column) => {
                        const bird = getAlternateDayBirdForActivity(
                          pakshaId,
                          weekday,
                          column.yama,
                          activityIndex,
                        );

                        const isSelected = bird
                          ? isAlternateAntharaCellSelected(
                              antharaSelection,
                              weekday,
                              column.yama,
                              "day",
                              bird,
                              activityTa,
                            )
                          : false;

                        return (
                          <td
                            key={column.yama}
                            className={[
                              "alternate-valarpirai-day-table__bird",
                              isSelected ? "patchi-pivot-table__cell--selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {bird ? (
                              <button
                                type="button"
                                className="patchi-pivot-table__cell-btn"
                                aria-expanded={isSelected}
                                onClick={() =>
                                  onOpenAnthara({
                                    weekday,
                                    yama: column.yama,
                                    period: "day",
                                    patchi: bird,
                                    thozhil: activityTa,
                                  })
                                }
                              >
                                <BilingualText text={patchiBilingual(bird)} />
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {showNight ? (
                    <>
                      <tr
                        className="alternate-all-chip-table__period-marker alternate-all-chip-table__night-start"
                        data-alternate-section
                        data-weekday={weekday}
                        data-period="night"
                      >
                        <th
                          scope="row"
                          className="alternate-all-chip-table__period-label alternate-valarpirai-day-table__activity"
                        >
                          <BilingualText text={periodAthikaraPatchiHeader("night").period} />
                        </th>
                        {jamamColumns.map((column) => (
                          <td
                            key={`night-spacer-${groupKey}-${column.yama}`}
                            className="alternate-all-chip-table__period-spacer"
                            aria-hidden="true"
                          />
                        ))}
                      </tr>
                      {ALTERNATE_NIGHT_ACTIVITY_TA.map((activityTa, activityIndex) => (
                        <tr key={`night-${groupKey}-${activityTa}`}>
                          <th
                            scope="row"
                            className="patchi-pivot-table__day alternate-valarpirai-day-table__activity"
                          >
                            <BilingualText text={activityBilingual(activityTa)} />
                          </th>
                          {jamamColumns.map((column) => {
                            const bird = getAlternateNightBirdForActivity(
                              pakshaId,
                              weekday,
                              column.yama,
                              activityIndex,
                            );

                            const isSelected = bird
                              ? isAlternateAntharaCellSelected(
                                  antharaSelection,
                                  weekday,
                                  column.yama,
                                  "night",
                                  bird,
                                  activityTa,
                                )
                              : false;

                            return (
                              <td
                                key={column.yama}
                                className={[
                                  "alternate-valarpirai-day-table__bird",
                                  isSelected ? "patchi-pivot-table__cell--selected" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {bird ? (
                                  <button
                                    type="button"
                                    className="patchi-pivot-table__cell-btn"
                                    aria-expanded={isSelected}
                                    onClick={() =>
                                      onOpenAnthara({
                                        weekday,
                                        yama: column.yama,
                                        period: "night",
                                        patchi: bird,
                                        thozhil: activityTa,
                                      })
                                    }
                                  >
                                    <BilingualText text={patchiBilingual(bird)} />
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlternatePakshaSingleBirdTables({
  jamamColumns,
  pakshaId,
  bird,
  antharaSelection,
  onOpenAnthara,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  bird: PatchiName;
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
}) {
  const showNight = alternatePakshaSupportsNight(pakshaId);

  return (
    <div className="alternate-valarpirai-single-bird">
      <h4 className="patchi-schedule-patchi-section__title patchi-schedule-patchi-section__title--centered alternate-valarpirai-single-bird__title">
        <BilingualText text={patchiBilingual(bird)} />
      </h4>
      <AlternatePakshaSingleBirdPeriodTable
        jamamColumns={jamamColumns}
        pakshaId={pakshaId}
        period="day"
        bird={bird}
        antharaSelection={antharaSelection}
        onOpenAnthara={onOpenAnthara}
      />
      {showNight ? (
        <AlternatePakshaSingleBirdPeriodTable
          jamamColumns={jamamColumns}
          pakshaId={pakshaId}
          period="night"
          bird={bird}
          antharaSelection={antharaSelection}
          onOpenAnthara={onOpenAnthara}
        />
      ) : null}
    </div>
  );
}

function AlternatePakshaSingleBirdPeriodTable({
  jamamColumns,
  pakshaId,
  period,
  bird,
  antharaSelection,
  onOpenAnthara,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  period: PeriodId;
  bird: PatchiName;
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
}) {
  const periodHeader = periodAthikaraPatchiHeader(period);
  const isDay = period === "day";
  const timeKey = isDay ? "dayTimeRange" : "nightTimeRange";
  const tableClass = isDay
    ? "alternate-valarpirai-day-table"
    : "alternate-valarpirai-night-table";

  return (
    <div className={`patchi-pivot-section ${tableClass} alternate-valarpirai-single-bird__period`}>
      <div className="sheet-table-wrap patchi-pivot-wrap">
        <table className={`sheet-table patchi-pivot-table ${tableClass}__grid`}>
          <thead>
            <tr>
              <th className="patchi-pivot-table__day-col">
                <span className="patchi-pivot-table__time">
                  <BilingualText text={periodHeader.period} />
                </span>
              </th>
              {jamamColumns.map((column) => (
                <th key={column.yama}>
                  <span className="patchi-pivot-table__jamam">
                    <BilingualText text={jamamBilingual(jamamIndexForYama(column.yama, period))} />
                  </span>
                  <span className="patchi-pivot-table__time">{column[timeKey]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALTERNATE_WEEKDAY_ORDER.map((weekday) => {
              const groupKey = getAlternateGroupKey(pakshaId, weekday);
              if (!groupKey) return null;

              return (
                <tr key={groupKey}>
                  <th scope="row" className="patchi-pivot-table__day">
                    <BilingualText text={getPakshaGroupDayBilingual(pakshaId, groupKey)} />
                  </th>
                  {jamamColumns.map((column) => {
                    const activity = isDay
                      ? getAlternateDayActivity(pakshaId, weekday, column.yama, bird)
                      : getAlternateNightActivity(pakshaId, weekday, column.yama, bird);

                    const isSelected = activity
                      ? isAlternateAntharaCellSelected(
                          antharaSelection,
                          weekday,
                          column.yama,
                          period,
                          bird,
                          activity,
                        )
                      : false;

                    return (
                      <td
                        key={column.yama}
                        className={[
                          "alternate-valarpirai-day-table__bird",
                          isSelected ? "patchi-pivot-table__cell--selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {activity ? (
                          <button
                            type="button"
                            className="patchi-pivot-table__cell-btn"
                            aria-expanded={isSelected}
                            onClick={() =>
                              onOpenAnthara({
                                weekday,
                                yama: column.yama,
                                period,
                                patchi: bird,
                                thozhil: activity,
                              })
                            }
                          >
                            <BilingualText text={displayActivityBi(activity)} />
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
