import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { BilingualText } from "./BilingualText";
import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { PatchiFilterChips, type PatchiSelection } from "./PatchiPickerBlock";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";

import type { PeriodId } from "../utils/jamam";
import { jamamIndexForYama } from "../utils/jamam";
import { buildJamamAntharaClick } from "../utils/anthara";
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
  ALTERNATE_ANTHARA_SEGMENT_COUNT,
  ALTERNATE_NIGHT_ACTIVITY_TA,
} from "../utils/alternateCalculation";

import {
  activityBilingual,
  jamamBilingual,
  PANCHA_ACTIVITY_TA,
  PATCHI_ORDER,
  patchiBilingual,
  bi,
  PAKSHA_BI,
  periodAthikaraPatchiHeader,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import {
  getThithiHeadingsForScheduleWeekday,
  getThithiLabelsForScheduleWeekday,
  getThithiPatchiEntryForDate,
  getThithiScheduleActivityWeekday,
  logAntharaThithiDebug,
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
  /** Day Scheduler keeps weekday headings. Thithi Schedule shows the matched Thithi Patchi names. */
  rowHeading?: "day" | "thithi";
}

const EMPTY_SCHEDULE_LABEL: Bilingual = bi("—", "—");

interface ThithiScheduleSection {
  key: string;
  headings: Bilingual[];
  activityWeekday: number;
  weekday: number;
  groupKey: string;
}

/** Morning bird grid for one activity weekday. Matching grids share one tithi cell. */
function morningActivityKey(
  pakshaId: "valarpirai" | "theipirai",
  activityWeekday: number,
  jamamColumns: DaySchedulerJamamColumn[],
): string {
  if (jamamColumns.length === 0) return `weekday:${activityWeekday}`;
  return jamamColumns
    .map((column) =>
      PANCHA_ACTIVITY_TA.map(
        (_, activityIndex) =>
          getAlternateDayBirdForActivity(
            pakshaId,
            activityWeekday,
            column.yama,
            activityIndex,
          ) ?? "—",
      ).join(","),
    )
    .join("|");
}

function sameThithiName(left: Bilingual, right: Bilingual): boolean {
  return left.ta === right.ta && left.en === right.en;
}

function scheduleRowHeading(
  pakshaId: "valarpirai" | "theipirai",
  weekday: number,
  groupKey: string,
  rowHeading: "day" | "thithi",
): Bilingual {
  if (rowHeading === "thithi") {
    return getThithiLabelsForScheduleWeekday(pakshaId, weekday) ?? EMPTY_SCHEDULE_LABEL;
  }
  return getPakshaGroupDayBilingual(pakshaId, groupKey);
}

interface AlternateAntharaSelection {
  weekday: number;
  yama: number;
  period: PeriodId;
  patchi: PatchiName;
  thozhil: string;
  sectionKey?: string;
}

function isAlternateAntharaCellSelected(
  selection: AlternateAntharaSelection | null,
  weekday: number,
  yama: number,
  period: PeriodId,
  patchi: PatchiName,
  thozhil: string,
  sectionKey?: string,
): boolean {
  if (!selection) return false;
  return (
    selection.weekday === weekday &&
    selection.yama === yama &&
    selection.period === period &&
    selection.patchi === patchi &&
    selection.thozhil === thozhil &&
    (selection.sectionKey ?? "") === (sectionKey ?? "")
  );
}

export function DaySchedulerTable({
  selectedPatchi,
  onSelectPatchi,
  selectedDateTime,
  subtitle,
  rowHeading = "day",
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
            rowHeading={rowHeading}
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
  rowHeading,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  selectedPatchi: PatchiSelection;
  selectedDateTime?: Date;
  rowHeading: "day" | "thithi";
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

  const antharaClick = useMemo(() => {
    if (!antharaSelection || !jamamSlot) return null;
    return buildJamamAntharaClick({
      period: antharaSelection.period,
      pakshaId,
      weekday: antharaSelection.weekday,
      jamamInstant: jamamSlot.start,
      coords,
      allJamamSlots,
    });
  }, [allJamamSlots, antharaSelection, coords, jamamSlot, pakshaId]);

  const nextMorningContext = antharaClick?.matrixOptions?.nextMorningThithiContext ?? null;

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
          rowHeading={rowHeading}
        />
      ) : (
        <AlternatePakshaSingleBirdTables
          jamamColumns={jamamColumns}
          pakshaId={pakshaId}
          bird={selectedPatchi}
          antharaSelection={antharaSelection}
          onOpenAnthara={setAntharaSelection}
          rowHeading={rowHeading}
        />
      )}
      {antharaClick && antharaSelection && jamamSlot ? (
        <JamamAntharaDialog
          open
          jamamSlot={jamamSlot}
          getActivitySlots={antharaClick.getActivitySlots}
          highlightPatchi={antharaSelection.patchi}
          highlightThozhil={antharaSelection.thozhil}
          onClose={() => setAntharaSelection(null)}
          coords={coords}
          jamamSlots={allJamamSlots}
          segmentCount={ALTERNATE_ANTHARA_SEGMENT_COUNT}
          matrixOptions={antharaClick.matrixOptions}
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
  rowHeading,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
  rowHeading: "day" | "thithi";
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

    const stickJamamHeader = () => {
      const head = stickyHeadRef.current;
      if (!head || rowHeading !== "thithi") {
        if (head) head.style.transform = "";
        return;
      }
      const wrap = head.closest(".patchi-pivot-wrap");
      if (!wrap) return;
      const navBottom = document.querySelector(".header")?.getBoundingClientRect().bottom ?? 0;
      const pinTop = Math.max(0, navBottom);
      const transform = getComputedStyle(head).transform;
      const applied =
        transform && transform !== "none" ? new DOMMatrix(transform).m42 || 0 : 0;
      const naturalTop = head.getBoundingClientRect().top - applied;
      const headHeight = head.getBoundingClientRect().height;
      const wrapBottom = wrap.getBoundingClientRect().bottom;
      let translate = 0;
      if (naturalTop < pinTop && wrapBottom > pinTop + headHeight) {
        translate = pinTop - naturalTop;
      }
      head.style.transform = translate ? `translateY(${translate}px)` : "";
    };

    const onScroll = () => {
      stickJamamHeader();
      updateActiveSection();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    const wrap = container.querySelector(".patchi-pivot-wrap");
    wrap?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      wrap?.removeEventListener("scroll", onScroll);
      stickyHeadRef.current?.style.removeProperty("transform");
    };
  }, [showNight, pakshaId, rowHeading]);

  const sectionRowSpan =
    1 +
    PANCHA_ACTIVITY_TA.length +
    (showNight ? 1 + ALTERNATE_NIGHT_ACTIVITY_TA.length : 0);

  const scheduleSections = useMemo((): ThithiScheduleSection[] => {
    if (rowHeading !== "thithi") {
      return ALTERNATE_WEEKDAY_ORDER.flatMap((weekday) => {
        const groupKey = getAlternateGroupKey(pakshaId, weekday);
        if (!groupKey) return [];
        return [
          {
            key: groupKey,
            headings: [],
            activityWeekday: weekday,
            weekday,
            groupKey,
          },
        ];
      });
    }

    const groups: ThithiScheduleSection[] = [];
    const groupByMorning = new Map<string, ThithiScheduleSection>();

    for (const weekday of ALTERNATE_WEEKDAY_ORDER) {
      const groupKey = getAlternateGroupKey(pakshaId, weekday);
      if (!groupKey) continue;
      const activityWeekday =
        getThithiScheduleActivityWeekday(pakshaId, weekday) ?? weekday;
      const morningKey = morningActivityKey(pakshaId, activityWeekday, jamamColumns);
      const headings =
        getThithiHeadingsForScheduleWeekday(pakshaId, weekday) ?? [EMPTY_SCHEDULE_LABEL];
      const existing = groupByMorning.get(morningKey);
      if (existing) {
        for (const heading of headings) {
          if (!existing.headings.some((item) => sameThithiName(item, heading))) {
            existing.headings.push(heading);
          }
        }
        continue;
      }
      const section: ThithiScheduleSection = {
        key: `${pakshaId}-${groupKey}-${morningKey}`,
        headings: [...headings],
        activityWeekday,
        weekday,
        groupKey,
      };
      groupByMorning.set(morningKey, section);
      groups.push(section);
    }

    return groups;
  }, [jamamColumns, pakshaId, rowHeading]);

  return (
    <div
      ref={containerRef}
      className={
        rowHeading === "thithi"
          ? "patchi-pivot-section alternate-valarpirai-all-chip alternate-valarpirai-all-chip--thithi"
          : "patchi-pivot-section alternate-valarpirai-all-chip"
      }
    >
      <div className="sheet-table-wrap patchi-pivot-wrap">
        <table
          className={
            rowHeading === "thithi"
              ? "sheet-table patchi-pivot-table alternate-all-chip-table alternate-all-chip-table--thithi"
              : "sheet-table patchi-pivot-table alternate-all-chip-table"
          }
        >
          <thead ref={stickyHeadRef} className="alternate-all-chip-table__sticky-head">
            <tr className="alternate-all-chip-table__jamam-row">
              {rowHeading === "thithi" ? (
                <th className="alternate-all-chip-table__thithi-col alternate-all-chip-table__thithi-col--head">
                  <BilingualText text={UI.thithi} />
                </th>
              ) : null}
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
            {scheduleSections.map((section, sectionIndex) => {
              const { weekday, groupKey, activityWeekday } = section;
              const weekdayStartClass = [
                "alternate-all-chip-table__period-marker",
                sectionIndex > 0 ? "alternate-all-chip-table__weekday-start--spaced" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Fragment key={section.key}>
                  <tr
                    className={weekdayStartClass}
                    data-alternate-section
                    data-weekday={weekday}
                    data-period="day"
                  >
                    {section.headings.length > 0 ? (
                      <th
                        scope="rowgroup"
                        rowSpan={sectionRowSpan}
                        className="alternate-all-chip-table__thithi-col"
                      >
                        <span className="alternate-all-chip-table__thithi-names">
                          {section.headings.map((heading) => (
                            <BilingualText
                              key={`${heading.ta}-${heading.en}`}
                              className="alternate-all-chip-table__thithi-name"
                              text={heading}
                            />
                          ))}
                        </span>
                      </th>
                    ) : null}
                    <th
                      scope="row"
                      className="alternate-all-chip-table__period-label alternate-valarpirai-day-table__activity"
                    >
                      {section.headings.length > 0 ? null : (
                        <>
                          <span className="alternate-all-chip-table__active-day">
                            <BilingualText
                              text={scheduleRowHeading(pakshaId, weekday, groupKey, rowHeading)}
                            />
                          </span>
                          <span className="alternate-all-chip-table__header-sep" aria-hidden="true">
                            ·
                          </span>
                        </>
                      )}
                      <BilingualText text={periodAthikaraPatchiHeader("day").period} />
                    </th>
                    {jamamColumns.map((column) => (
                      <td
                        key={`day-spacer-${section.key}-${column.yama}`}
                        className="alternate-all-chip-table__period-spacer"
                        aria-hidden="true"
                      />
                    ))}
                  </tr>
                  {PANCHA_ACTIVITY_TA.map((activityTa, activityIndex) => (
                    <tr key={`day-${section.key}-${activityTa}`}>
                      <th
                        scope="row"
                        className="patchi-pivot-table__day alternate-valarpirai-day-table__activity"
                      >
                        <BilingualText text={activityBilingual(activityTa)} />
                      </th>
                      {jamamColumns.map((column) => {
                        const bird = getAlternateDayBirdForActivity(
                          pakshaId,
                          activityWeekday,
                          column.yama,
                          activityIndex,
                        );

                        const isSelected = bird
                          ? isAlternateAntharaCellSelected(
                              antharaSelection,
                              activityWeekday,
                              column.yama,
                              "day",
                              bird,
                              activityTa,
                              section.key,
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
                                    weekday: activityWeekday,
                                    yama: column.yama,
                                    period: "day",
                                    patchi: bird,
                                    thozhil: activityTa,
                                    sectionKey: section.key,
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
                            key={`night-spacer-${section.key}-${column.yama}`}
                            className="alternate-all-chip-table__period-spacer"
                            aria-hidden="true"
                          />
                        ))}
                      </tr>
                      {ALTERNATE_NIGHT_ACTIVITY_TA.map((activityTa, activityIndex) => (
                        <tr key={`night-${section.key}-${activityTa}`}>
                          <th
                            scope="row"
                            className="patchi-pivot-table__day alternate-valarpirai-day-table__activity"
                          >
                            <BilingualText text={activityBilingual(activityTa)} />
                          </th>
                          {jamamColumns.map((column) => {
                            const bird = getAlternateNightBirdForActivity(
                              pakshaId,
                              activityWeekday,
                              column.yama,
                              activityIndex,
                            );

                            const isSelected = bird
                              ? isAlternateAntharaCellSelected(
                                  antharaSelection,
                                  activityWeekday,
                                  column.yama,
                                  "night",
                                  bird,
                                  activityTa,
                                  section.key,
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
                                        weekday: activityWeekday,
                                        yama: column.yama,
                                        period: "night",
                                        patchi: bird,
                                        thozhil: activityTa,
                                        sectionKey: section.key,
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
  rowHeading,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  bird: PatchiName;
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
  rowHeading: "day" | "thithi";
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
        rowHeading={rowHeading}
      />
      {showNight ? (
        <AlternatePakshaSingleBirdPeriodTable
          jamamColumns={jamamColumns}
          pakshaId={pakshaId}
          period="night"
          bird={bird}
          antharaSelection={antharaSelection}
          onOpenAnthara={onOpenAnthara}
          rowHeading={rowHeading}
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
  rowHeading,
}: {
  jamamColumns: DaySchedulerJamamColumn[];
  pakshaId: "valarpirai" | "theipirai";
  period: PeriodId;
  bird: PatchiName;
  antharaSelection: AlternateAntharaSelection | null;
  onOpenAnthara: (selection: AlternateAntharaSelection) => void;
  rowHeading: "day" | "thithi";
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
                {rowHeading === "thithi" ? (
                  <span className="patchi-pivot-table__jamam">
                    <BilingualText text={UI.thithi} />
                  </span>
                ) : null}
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
              const activityWeekday =
                rowHeading === "thithi"
                  ? (getThithiScheduleActivityWeekday(pakshaId, weekday) ?? weekday)
                  : weekday;

              return (
                <tr key={groupKey}>
                  <th scope="row" className="patchi-pivot-table__day">
                    <BilingualText
                      text={scheduleRowHeading(pakshaId, weekday, groupKey, rowHeading)}
                    />
                  </th>
                  {jamamColumns.map((column) => {
                    const activity = isDay
                      ? getAlternateDayActivity(pakshaId, activityWeekday, column.yama, bird)
                      : getAlternateNightActivity(pakshaId, activityWeekday, column.yama, bird);

                    const isSelected = activity
                      ? isAlternateAntharaCellSelected(
                          antharaSelection,
                          activityWeekday,
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
                                weekday: activityWeekday,
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
