import { useMemo } from "react";

import type { ActivitySlot } from "../types";

import { displayActivityBi } from "../utils/activityLabel";

import {
  antharaJamamHeader,
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
} from "../utils/jamam";

import { antharaDialogTitle, getAntharaSegmentColumns, getPatchiAntharaMatrix } from "../utils/anthara";

import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";

export interface JamamSegmentsPanelProps {
  jamamSlot: JamamSlot;
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[];
  highlightPatchi: string;
  highlightThozhil: string;
  highlightSegmentIndex?: number;
  onClose: () => void;
  coords?: GeoCoords | null;
  jamamSlots?: JamamSlot[];
  cycleStart?: Date;
}

export function JamamSegmentsPanel({
  jamamSlot,
  getActivitySlots,
  highlightPatchi,
  highlightThozhil,
  highlightSegmentIndex,
  onClose,
  coords = null,
  jamamSlots,
  cycleStart,
}: JamamSegmentsPanelProps) {
  const matrix = getPatchiAntharaMatrix(
    jamamSlot.start,
    jamamSlot.end,
    getActivitySlots,
    jamamSlot.index,
  );
  const title = antharaDialogTitle(jamamSlot.index, highlightPatchi, highlightThozhil);

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
    return getAntharaSegmentColumns(previousJamamSlot.start, previousJamamSlot.end);
  }, [previousJamamSlot]);

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
                const patchiHighlighted = row.patchi === highlightPatchi;

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
                      <BilingualText text={antharaJamamHeader(column.segmentIndex + 1)} />
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
                    <span className="jamam-segments-table__jamam-time">{column.startTimeLabel}</span>
                  </td>
                  {activities.map((activity, patchiIndex) => {
                    const patchi = matrix.rows[patchiIndex]?.patchi;
                    const patchiHighlighted = patchi === highlightPatchi;
                    const cellHighlighted = rowHighlighted && patchiHighlighted;

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
