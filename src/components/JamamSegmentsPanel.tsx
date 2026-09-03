import type { ActivitySlot } from "../types";

import { getJamamAntharaRows } from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import {
  antharaStartTimeHeader,
  patchiEmoji,
  patchiHeader,
  patchiLabelBilingual,
  previousJamamTimeHeader,
  thozhilHeader,
  UI,
} from "../utils/bilingual";

import { formatTimeWithSeconds, getPreviousJamamIndex, splitJamamStartTimes } from "../utils/jamam";

import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";



export interface JamamSegmentsPanelProps {

  start: Date;

  end: Date;

  activity: string;

  dayJamamSlots: ActivitySlot[];

  nightJamamSlots: ActivitySlot[];

  previousJamamStart?: Date;

  previousJamamEnd?: Date;

  previousJamamIndex?: number;

  jamamIndex: number;

  onClose: () => void;

}



export function JamamSegmentsPanel({

  start,

  end,

  activity,

  dayJamamSlots,

  nightJamamSlots,

  previousJamamStart,

  previousJamamEnd,

  previousJamamIndex,

  jamamIndex,

  onClose,

}: JamamSegmentsPanelProps) {

  const antharaRows = getJamamAntharaRows(start, end, activity, dayJamamSlots, nightJamamSlots);

  const showPreviousJamam = !!(previousJamamStart && previousJamamEnd);
  const previousIndex = previousJamamIndex ?? getPreviousJamamIndex(jamamIndex);
  const previousSegmentStarts = showPreviousJamam
    ? splitJamamStartTimes(previousJamamStart, previousJamamEnd)
    : [];



  return (

    <div className="jamam-segments-panel">

      <div className="jamam-segments-panel__head">

        <button

          type="button"

          className="jamam-segments-panel__close"

          aria-label={`${UI.close.ta} ${UI.close.en}`}

          onClick={onClose}

        >

          <BilingualText text={UI.close} />

        </button>

      </div>

      <table
        className={[
          "jamam-segments-table",
          "jamam-segments-table--anthara",
          showPreviousJamam ? "jamam-segments-table--anthara-with-previous" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

        <thead>

          <tr>

            {showPreviousJamam ? (
              <th scope="col">
                <BilingualText text={previousJamamTimeHeader(previousIndex)} />
              </th>
            ) : null}

            <th scope="col">
              <BilingualText text={antharaStartTimeHeader(jamamIndex)} />
            </th>

            <th scope="col">
              <BilingualText text={thozhilHeader(jamamIndex)} />
            </th>

            <th scope="col">
              <BilingualText text={patchiHeader(jamamIndex)} />
            </th>

          </tr>

        </thead>

        <tbody>

          {antharaRows.map((row, rowIndex) => (

            <tr key={row.index}>

              {showPreviousJamam ? (
                <td>{formatTimeWithSeconds(previousSegmentStarts[rowIndex])}</td>
              ) : null}

              <td>{formatTimeWithSeconds(row.start)}</td>

              <td>

                {row.activity === "—" ? (

                  "—"

                ) : (

                  <InlineEmojiLabel text={displayActivityBi(row.activity)} />

                )}

              </td>

              <td>

                {row.bird === "—" ? (

                  "—"

                ) : (

                  <InlineEmojiLabel
                    text={patchiLabelBilingual(row.bird)}
                    emoji={patchiEmoji(row.bird)}
                  />

                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

