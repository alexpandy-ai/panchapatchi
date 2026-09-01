import type { ActivitySlot } from "../types";

import { getJamamAntharaRows } from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import { patchiEmoji, patchiLabelBilingual, UI } from "../utils/bilingual";

import { formatTimeWithSeconds } from "../utils/jamam";

import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";



export interface JamamSegmentsPanelProps {

  start: Date;

  end: Date;

  activity: string;

  dayJamamSlots: ActivitySlot[];

  nightJamamSlots: ActivitySlot[];

  onClose: () => void;

}



export function JamamSegmentsPanel({

  start,

  end,

  activity,

  dayJamamSlots,

  nightJamamSlots,

  onClose,

}: JamamSegmentsPanelProps) {

  const antharaRows = getJamamAntharaRows(start, end, activity, dayJamamSlots, nightJamamSlots);



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

      <table className="jamam-segments-table jamam-segments-table--anthara">

        <thead>

          <tr>

            <th scope="col">

              <BilingualText text={UI.segmentStartTime} />

            </th>

            <th scope="col">

              <BilingualText text={UI.action} />

            </th>

            <th scope="col">

              <BilingualText text={UI.patchi} />

            </th>

          </tr>

        </thead>

        <tbody>

          {antharaRows.map((row) => (

            <tr key={row.index}>

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

