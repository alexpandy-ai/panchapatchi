import { useEffect, useMemo } from "react";

import type { ActivitySlot } from "../types";

import { displayActivity, displayActivityBi } from "../utils/activityLabel";

import {
  antharaColumnRowLabel,
  antharaJamamHeader,
  antharaMorningJamamHeader,
  patchiBaseName,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
} from "../utils/bilingual";

import type { GeoCoords } from "../utils/location";

import type { JamamSlot, PeriodId } from "../utils/jamam";

import {
  getPreviousJamamIndex,
  getPreviousJamamSlot,
  getPreviousJamamSlotForIndex,
  shouldShowPreviousJamamRow,
  yamaFromJamamIndex,
} from "../utils/jamam";

import {
  antharaDialogTitle,
  antharaSegmentCountForJamam,
  antharaSegmentWindow,
  getAntharaSegmentColumns,
  getPatchiAntharaMatrix,
  antharaColumnJamamIndex,
  nightJamamIndicesRotatedFromYama,
  yamasRotatedFrom,
  clickedPeriodJamamSerials,
  type PatchiAntharaMatrixOptions,
} from "../utils/anthara";
import { logAntharaThithiDebug } from "../utils/thithi";

import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";

export interface NaalActivitySelection {
  segmentStart: Date;
  segmentEnd: Date;
  antharaSerial: number;
  patchi: string;
  activity: string;
  /** Birds and their anthara-row activities shown in Naal (one on Home, all elsewhere). */
  birdRows: { patchi: string; activity: string }[];
  period: PeriodId;
  /**
   * When true, keep the start activity on every Naal slot instead of cycling.
   * Day Scheduler night jamam rows must leave this false so each bird cycles.
   */
  repeatActivity: boolean;
  /**
   * Night anthara → Naal: rows 6–10 are next Thithi day’s day jamams (yama-rotated).
   */
  appendNextDayMorning?: boolean;
  /** Per bird, day activities for next-day jamams (order matches appendedJamamSerials). */
  nextDayMorningByBird?: { patchi: string; activities: string[] }[];
  /**
   * Next-day morning Anthara row → Naal: rows 1–5 day cycle, rows 6–10 that day’s night jamams.
   */
  appendNextDayNight?: boolean;
  /** Per bird, night activities for next-day jamams (order matches appendedJamamSerials). */
  nextDayNightByBird?: { patchi: string; activities: string[] }[];
  /**
   * Day anthara → Naal: rows 6–10 are same-day night jamams (yama-rotated from the clicked row).
   */
  appendNightJamam?: boolean;
  /** Per bird, night jamam activities (order matches appendedJamamSerials). */
  nightJamamByBird?: { patchi: string; activities: string[] }[];
  /**
   * Labels for Naal rows 6–10: morning yamas, or night schedule indices (6–10), in display order.
   */
  appendedJamamSerials?: number[];
  /** Labels for Naal rows 1–5: rotation from the clicked Antharam row’s jamam. */
  antharaJamamSerials?: number[];
}

export interface JamamSegmentsPanelProps {
  jamamSlot: JamamSlot;
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[];
  highlightPatchi: string;
  highlightThozhil: string;
  highlightSegmentIndex?: number;
  /** When set, show only this bird's activity column. */
  onlyPatchi?: string;
  onClose: () => void;
  /** Open Naal dialog for the clicked anthara activity cell. */
  onActivityClick?: (selection: NaalActivitySelection) => void;
  coords?: GeoCoords | null;
  jamamSlots?: JamamSlot[];
  cycleStart?: Date;
  segmentCount?: number;
  matrixOptions?: PatchiAntharaMatrixOptions;
}

function activitiesForBirdsFromSlots(
  birdSourceRows: { patchi: string }[],
  getSlots: (yama: number) => ActivitySlot[],
  yamaOrder: number[] = [1, 2, 3, 4, 5],
): { patchi: string; activities: string[] }[] {
  return birdSourceRows.map((row) => ({
    patchi: row.patchi,
    activities: yamaOrder.map((yama) => {
      const slots = getSlots(yama);
      const match = slots.find((entry) => patchiBaseName(entry.bird) === row.patchi);
      return match ? displayActivity(match.activity) : "—";
    }),
  }));
}

/** Display-order serial for the Antharam column (1-based row index). */
function antharaSerialNumber(column: {
  jamamIndex?: number;
  segmentIndex: number;
  appendedMorning?: boolean;
}): number {
  return column.segmentIndex + 1;
}

function antharaRowHeader(
  column: {
    jamamIndex?: number;
    segmentIndex: number;
    appendedMorning?: boolean;
  },
  parentJamamIndex: number,
) {
  const displaySerial = antharaSerialNumber(column);
  const jamamNumber = antharaColumnJamamIndex(column, parentJamamIndex);
  if (column.appendedMorning) {
    return antharaColumnRowLabel(displaySerial, antharaMorningJamamHeader(jamamNumber));
  }
  return antharaColumnRowLabel(displaySerial, antharaJamamHeader(jamamNumber));
}

export function JamamSegmentsPanel({
  jamamSlot,
  getActivitySlots,
  highlightPatchi,
  highlightThozhil,
  highlightSegmentIndex,
  onlyPatchi,
  onClose,
  onActivityClick,
  coords = null,
  jamamSlots,
  cycleStart,
  segmentCount,
  matrixOptions,
}: JamamSegmentsPanelProps) {
  const fullMatrix = getPatchiAntharaMatrix(
    jamamSlot.start,
    jamamSlot.end,
    getActivitySlots,
    jamamSlot.index,
    segmentCount,
    matrixOptions,
  );
  const wantedPatchi = onlyPatchi ? patchiBaseName(onlyPatchi) : "";
  const matrix = onlyPatchi
    ? {
        ...fullMatrix,
        rows: fullMatrix.rows.filter((row) => patchiBaseName(row.patchi) === wantedPatchi),
      }
    : fullMatrix;
  const title = antharaDialogTitle(jamamSlot.index, highlightPatchi, highlightThozhil);
  const singleBird = Boolean(onlyPatchi);

  const showPreviousJamamRow = shouldShowPreviousJamamRow(jamamSlot.index);

  const previousJamamSlot = useMemo(() => {
    if (!showPreviousJamamRow) return null;
    if (jamamSlots && cycleStart) {
      return getPreviousJamamSlot(jamamSlots, jamamSlot.index, cycleStart, coords);
    }
    if (jamamSlots) {
      const previousIndex = getPreviousJamamIndex(jamamSlot.index);
      if (previousIndex < jamamSlot.index) {
        return jamamSlots.find((slot) => slot.index === previousIndex) ?? null;
      }
    }
    return getPreviousJamamSlotForIndex(jamamSlot.index, jamamSlot.start, coords);
  }, [coords, cycleStart, jamamSlot.index, jamamSlot.start, jamamSlots, showPreviousJamamRow]);

  const previousJamamColumns = useMemo(() => {
    if (!previousJamamSlot) return null;
    const previousSegmentCount = antharaSegmentCountForJamam(
      previousJamamSlot.index,
      segmentCount,
      matrixOptions?.appendNightJamamRows,
    );
    return getAntharaSegmentColumns(
      previousJamamSlot.start,
      previousJamamSlot.end,
      previousSegmentCount,
    );
  }, [matrixOptions?.appendNightJamamRows, previousJamamSlot, segmentCount]);

  const segmentRows = useMemo(
    () =>
      matrix.columns.map((column, segmentIndex) => ({
        column,
        segmentIndex,
        previousTimeLabel: previousJamamColumns?.[segmentIndex]?.startTimeLabel ?? null,
        activities: matrix.rows.map((row) => row.activities[segmentIndex] ?? "—"),
      })),
    [matrix.columns, matrix.rows, previousJamamColumns],
  );

  const { period: selectedJamamType } = yamaFromJamamIndex(jamamSlot.index);

  useEffect(() => {
    const highlightRow = matrix.rows.find(
      (row) => patchiBaseName(row.patchi) === patchiBaseName(highlightPatchi),
    );
    const context = matrixOptions?.nextMorningThithiContext;
    if (context) {
      logAntharaThithiDebug({
        selectedJamamType: context.selectedJamamType,
        originalDate: context.originalDate,
        originalThithi: context.originalThithi,
        nextMorningDate: context.nextMorningDate,
        nextMorningThithi: context.nextMorningThithi,
        finalActivity: highlightRow?.activities ?? highlightThozhil,
      });
      return;
    }
    if (selectedJamamType === "day") {
      console.info("[Antharam]", {
        selectedJamamType: "day",
        finalActivity: highlightRow?.activities ?? highlightThozhil,
      });
    }
  }, [
    highlightPatchi,
    highlightThozhil,
    matrix.rows,
    matrixOptions?.nextMorningThithiContext,
    selectedJamamType,
  ]);

  return (
    <div className="jamam-segments-panel">
      <div className="jamam-segments-panel__head">
        <h4 className="jamam-segments-panel__title">
          <BilingualText text={title} />
        </h4>
        <button
          type="button"
          className="jamam-segments-panel__close"
          aria-label={`${UI.close.ta} ${UI.close.en}`}
          onClick={onClose}
        >
          <BilingualText text={UI.close} />
        </button>
      </div>

      <div className="jamam-segments-panel__scroll">
        <table
          className={[
            "jamam-segments-table",
            "jamam-segments-table--matrix",
            singleBird ? "jamam-segments-table--single-bird" : "",
            showPreviousJamamRow ? "jamam-segments-table--matrix-with-previous" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <colgroup>
            <col className="jamam-segments-table__col-segment-number" />
            {showPreviousJamamRow ? (
              <col className="jamam-segments-table__col-segment-previous" />
            ) : null}
            <col className="jamam-segments-table__col-segment-time" />
            {matrix.rows.map((row) => (
              <col key={`col-${row.patchi}`} className="jamam-segments-table__col-patchi" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="jamam-segments-table__segment-number-col">
                <BilingualText text={UI.antharaJamam} />
              </th>
              {showPreviousJamamRow ? (
                <th scope="col" className="jamam-segments-table__segment-previous-col">
                  <BilingualText text={UI.antharaPreviousTime} />
                </th>
              ) : null}
              <th scope="col" className="jamam-segments-table__segment-time-col">
                <BilingualText text={UI.antharaCurrentTime} />
              </th>
              {matrix.rows.map((row) => {
                const patchiHighlighted = !singleBird && row.patchi === highlightPatchi;

                return (
                  <th
                    key={row.patchi}
                    scope="col"
                    className={[
                      patchiHighlighted ? "jamam-segments-table__col--highlight" : "",
                      patchiHighlighted ? "jamam-segments-table__patchi-header--highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <InlineEmojiLabel
                      text={patchiLabelBilingual(row.patchi)}
                      emoji={patchiEmoji(row.patchi)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {segmentRows.map(({ column, segmentIndex, previousTimeLabel, activities }) => {
              const rowHighlighted = highlightSegmentIndex === segmentIndex;
              const serial = antharaSerialNumber(column);

              return (
                <tr
                  key={column.segmentIndex}
                  className={rowHighlighted ? "jamam-segments-table__row--highlight" : ""}
                >
                  <th
                    scope="row"
                    className={[
                      "jamam-segments-table__segment-number-col",
                      rowHighlighted ? "jamam-segments-table__col--highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="jamam-segments-table__jamam-label">
                      <BilingualText text={antharaRowHeader(column, jamamSlot.index)} />
                    </span>
                  </th>
                  {showPreviousJamamRow ? (
                    <td
                      className={[
                        "jamam-segments-table__segment-previous-col",
                        rowHighlighted ? "jamam-segments-table__col--highlight" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {previousTimeLabel ? (
                        <span className="jamam-segments-table__jamam-time jamam-segments-table__jamam-time--previous">
                          {previousTimeLabel}
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                  <td
                    className={[
                      "jamam-segments-table__segment-time-col",
                      rowHighlighted ? "jamam-segments-table__col--highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="jamam-segments-table__jamam-time">
                      {column.startTimeLabel}
                    </span>
                  </td>
                  {activities.map((activity, patchiIndex) => {
                    const patchi = matrix.rows[patchiIndex]?.patchi;
                    const patchiHighlighted =
                      singleBird || patchi === highlightPatchi;
                    const cellHighlighted = rowHighlighted && patchiHighlighted;
                    const canOpenNaal =
                      Boolean(onActivityClick) && activity !== "—" && Boolean(patchi);

                    return (
                      <td
                        key={`${column.segmentIndex}-${patchi}`}
                        className={[
                          patchiHighlighted ? "jamam-segments-table__col--highlight" : "",
                          cellHighlighted ? "jamam-segments-table__cell--highlight" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {activity === "—" ? (
                          "—"
                        ) : canOpenNaal ? (
                          <button
                            type="button"
                            className="jamam-segments-table__activity-btn"
                            onClick={() => {
                              const { start, end } = antharaSegmentWindow(
                                matrix.columns,
                                segmentIndex,
                                jamamSlot.end,
                              );
                              const { period: jamamPeriod } = yamaFromJamamIndex(jamamSlot.index);
                              const rowJamamIndex = antharaColumnJamamIndex(
                                column,
                                jamamSlot.index,
                              );
                              const { yama: rowYama } = yamaFromJamamIndex(rowJamamIndex);
                              const isAppendedMorning = column.appendedMorning === true;
                              const isAppendedNightJamam =
                                column.jamamIndex != null && !isAppendedMorning;
                              const birdSourceRows = onlyPatchi
                                ? fullMatrix.rows.filter(
                                    (row) => patchiBaseName(row.patchi) === wantedPatchi,
                                  )
                                : fullMatrix.rows;
                              const birdRows = onlyPatchi
                                ? [{ patchi: patchi!, activity }]
                                : fullMatrix.rows.map((row) => ({
                                    patchi: row.patchi,
                                    activity: row.activities[segmentIndex] ?? "—",
                                  }));

                              const morningSlotsFn = matrixOptions?.getMorningJamamActivitySlots;
                              const nextDayNightSlotsFn =
                                matrixOptions?.getNextDayNightJamamActivitySlots;
                              const appendNextDayMorning =
                                jamamPeriod === "night" &&
                                !isAppendedMorning &&
                                Boolean(morningSlotsFn);
                              const appendNextDayNight =
                                isAppendedMorning && Boolean(nextDayNightSlotsFn);
                              const appendNightJamam =
                                jamamPeriod === "day" &&
                                !isAppendedMorning &&
                                !isAppendedNightJamam &&
                                matrixOptions?.appendNightJamamRows === true &&
                                Boolean(matrixOptions.allJamamSlots?.length);

                              const morningYamaOrder = yamasRotatedFrom(rowYama);
                              const nightYamaOrderFromMorning = yamasRotatedFrom(rowYama);
                              const nightYamaOrderFromDay = yamasRotatedFrom(rowYama);

                              const appendedJamamSerials = appendNextDayMorning
                                ? morningYamaOrder
                                : appendNextDayNight
                                  ? nightJamamIndicesRotatedFromYama(rowYama)
                                  : appendNightJamam
                                    ? nightJamamIndicesRotatedFromYama(rowYama)
                                    : undefined;

                              const antharaJamamSerials =
                                clickedPeriodJamamSerials(rowJamamIndex);

                              const naalSelection = {
                                segmentStart: start,
                                segmentEnd: end,
                                antharaSerial: serial,
                                patchi: patchi!,
                                activity,
                                birdRows,
                                // Appended night jamam rows must cycle with night order (not the parent day jamam period).
                                period: isAppendedMorning
                                  ? "day"
                                  : isAppendedNightJamam
                                    ? "night"
                                    : jamamPeriod,
                                // Never repeat one jamam activity across all Naal slots — each bird cycles from its cell.
                                repeatActivity: false,
                                appendNextDayMorning,
                                nextDayMorningByBird:
                                  appendNextDayMorning && morningSlotsFn
                                    ? activitiesForBirdsFromSlots(
                                        birdSourceRows,
                                        morningSlotsFn,
                                        morningYamaOrder,
                                      )
                                    : undefined,
                                appendNextDayNight,
                                nextDayNightByBird:
                                  appendNextDayNight && nextDayNightSlotsFn
                                    ? activitiesForBirdsFromSlots(
                                        birdSourceRows,
                                        nextDayNightSlotsFn,
                                        nightYamaOrderFromMorning,
                                      )
                                    : undefined,
                                appendNightJamam,
                                nightJamamByBird:
                                  appendNightJamam
                                    ? activitiesForBirdsFromSlots(
                                        birdSourceRows,
                                        (yama) => getActivitySlots(yama, "night"),
                                        nightYamaOrderFromDay,
                                      )
                                    : undefined,
                                appendedJamamSerials,
                                antharaJamamSerials,
                              };
                              const nextMorning = matrixOptions?.nextMorningThithiContext;
                              if (nextMorning && (appendNextDayMorning || appendNextDayNight)) {
                                logAntharaThithiDebug({
                                  selectedJamamType: appendNextDayNight ? "day" : "night",
                                  originalDate: nextMorning.originalDate,
                                  originalThithi: nextMorning.originalThithi,
                                  nextMorningDate: nextMorning.nextMorningDate,
                                  nextMorningThithi: nextMorning.nextMorningThithi,
                                  finalActivity: [
                                    activity,
                                    ...(naalSelection.nextDayMorningByBird?.find(
                                      (row) => row.patchi === patchi,
                                    )?.activities ??
                                      naalSelection.nextDayNightByBird?.find(
                                        (row) => row.patchi === patchi,
                                      )?.activities ??
                                      []),
                                  ],
                                });
                              }
                              onActivityClick?.(naalSelection);
                            }}
                          >
                            <InlineEmojiLabel text={displayActivityBi(activity)} />
                          </button>
                        ) : (
                          <InlineEmojiLabel text={displayActivityBi(activity)} />
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
