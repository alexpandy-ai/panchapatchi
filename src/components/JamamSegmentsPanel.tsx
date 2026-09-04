import { useMemo } from "react";

import type { ActivitySlot } from "../types";

import { displayActivityBi } from "../utils/activityLabel";

import {
  antharaJamamHeader,
  patchiEmoji,
  patchiLabelBilingual,
  previousJamamRowLabel,
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
        <table className="jamam-segments-table jamam-segments-table--matrix">
          <colgroup>
            <col className="jamam-segments-table__col-patchi" />
            {matrix.columns.map((column) => (
              <col
                key={`col-${column.segmentIndex}`}
                className="jamam-segments-table__col-segment"
              />
            ))}
          </colgroup>
          <thead>
            {showPreviousJamamRow && previousJamamColumns && previousJamamSlot ? (
              <tr className="jamam-segments-table__row--previous">
                <th scope="row" className="jamam-segments-table__patchi-col">
                  <BilingualText text={previousJamamRowLabel(previousJamamSlot.index)} />
                </th>
                {previousJamamColumns.map((column) => (
                  <td
                    key={`previous-${column.segmentIndex}`}
                    className={
                      highlightSegmentIndex === column.segmentIndex
                        ? "jamam-segments-table__col--highlight"
                        : ""
                    }
                  >
                    <span className="jamam-segments-table__jamam-label">
                      <BilingualText text={antharaJamamHeader(column.segmentIndex + 1)} />
                    </span>
                    <span className="jamam-segments-table__jamam-time">{column.startTimeLabel}</span>
                  </td>
                ))}
              </tr>
            ) : null}
            <tr>
              <th scope="col" className="jamam-segments-table__patchi-col">
                <BilingualText text={UI.patchiColumn} />
              </th>
              {matrix.columns.map((column) => (
                <th
                  key={column.segmentIndex}
                  scope="col"
                  className={
                    highlightSegmentIndex === column.segmentIndex
                      ? "jamam-segments-table__col--highlight"
                      : ""
                  }
                >
                  <span className="jamam-segments-table__jamam-label">
                    <BilingualText text={antharaJamamHeader(column.segmentIndex + 1)} />
                  </span>
                  <span className="jamam-segments-table__jamam-time">{column.startTimeLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => {
              const rowHighlighted = row.patchi === highlightPatchi;

              return (
                <tr
                  key={row.patchi}
                  className={rowHighlighted ? "jamam-segments-table__row--highlight" : ""}
                >
                  <th scope="row" className="jamam-segments-table__patchi-col">
                    <InlineEmojiLabel
                      text={patchiLabelBilingual(row.patchi)}
                      emoji={patchiEmoji(row.patchi)}
                    />
                  </th>
                  {row.activities.map((activity, columnIndex) => {
                    const segmentIndex = matrix.columns[columnIndex]?.segmentIndex;
                    const columnHighlighted = highlightSegmentIndex === segmentIndex;
                    const cellHighlighted = rowHighlighted && columnHighlighted;

                    return (
                      <td
                        key={`${row.patchi}-${segmentIndex}`}
                        className={[
                          columnHighlighted ? "jamam-segments-table__col--highlight" : "",
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
