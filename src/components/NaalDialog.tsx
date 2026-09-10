import { useEffect, useMemo } from "react";

import { displayActivityBi } from "../utils/activityLabel";
import {
  antharaActivitiesFrom,
  ANTHARA_DAY_SEGMENT_COUNT,
  getAntharaSegmentColumns,
  JAMAM_ANTHARA_SEGMENT_COUNT,
  naalAllBirdsDialogTitle,
  naalDialogTitle,
} from "../utils/anthara";
import {
  antharaMorningJamamHeader,
  JAMAM_ACTIVITY_TA,
  PANCHA_ACTIVITY_TA,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
} from "../utils/bilingual";
import type { PeriodId } from "../utils/jamam";

import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";

export interface NaalDialogProps {
  open: boolean;
  segmentStart: Date;
  segmentEnd: Date;
  antharaSerial: number;
  patchi: string;
  activity: string;
  birdRows: { patchi: string; activity: string }[];
  period: PeriodId;
  /** Jamam-level rows (6–10): same activity on every Naal slot. */
  repeatActivity?: boolean;
  /** Night Naal: rows 6–10 = next Thithi day jamams 1–5. */
  appendNextDayMorning?: boolean;
  nextDayMorningByBird?: { patchi: string; activities: string[] }[];
  onClose: () => void;
}

function naalCycleActivities(startActivity: string, period: PeriodId, count: number): string[] {
  if (startActivity === "—" || startActivity === "") {
    return Array.from({ length: count }, () => "—");
  }
  const order = period === "day" ? PANCHA_ACTIVITY_TA : JAMAM_ACTIVITY_TA;
  return antharaActivitiesFrom(startActivity, count, order);
}

function naalActivitiesForBird(
  startActivity: string,
  period: PeriodId,
  repeatActivity: boolean,
  appendNextDayMorning: boolean,
  nextDayMorningActivities: string[] | undefined,
): string[] {
  if (startActivity === "—" || startActivity === "") {
    return Array.from({ length: JAMAM_ANTHARA_SEGMENT_COUNT }, () => "—");
  }
  if (repeatActivity) {
    return Array.from({ length: JAMAM_ANTHARA_SEGMENT_COUNT }, () => startActivity);
  }
  if (appendNextDayMorning) {
    const antharaPart = naalCycleActivities(
      startActivity,
      period,
      ANTHARA_DAY_SEGMENT_COUNT,
    );
    const morningPart =
      nextDayMorningActivities && nextDayMorningActivities.length >= ANTHARA_DAY_SEGMENT_COUNT
        ? nextDayMorningActivities.slice(0, ANTHARA_DAY_SEGMENT_COUNT)
        : Array.from({ length: ANTHARA_DAY_SEGMENT_COUNT }, () => "—");
    return [...antharaPart, ...morningPart];
  }
  return naalCycleActivities(startActivity, period, JAMAM_ANTHARA_SEGMENT_COUNT);
}

export function NaalDialog({
  open,
  segmentStart,
  segmentEnd,
  antharaSerial,
  patchi,
  activity,
  birdRows,
  period,
  repeatActivity = false,
  appendNextDayMorning = false,
  nextDayMorningByBird,
  onClose,
}: NaalDialogProps) {
  const singleBird = birdRows.length <= 1;
  const title = singleBird
    ? naalDialogTitle(antharaSerial, patchi, activity)
    : naalAllBirdsDialogTitle(antharaSerial);

  const columns = useMemo(
    () => getAntharaSegmentColumns(segmentStart, segmentEnd, JAMAM_ANTHARA_SEGMENT_COUNT),
    [segmentEnd, segmentStart],
  );

  const birdActivityRows = useMemo(
    () =>
      birdRows.map((row) => {
        const morning = nextDayMorningByBird?.find((entry) => entry.patchi === row.patchi);
        return {
          patchi: row.patchi,
          activities: naalActivitiesForBird(
            row.activity,
            period,
            repeatActivity,
            appendNextDayMorning,
            morning?.activities,
          ),
        };
      }),
    [appendNextDayMorning, birdRows, nextDayMorningByBird, period, repeatActivity],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="anthara-dialog-overlay naal-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={[
          "anthara-dialog",
          "naal-dialog",
          singleBird ? "naal-dialog--single" : "naal-dialog--all-birds",
          appendNextDayMorning ? "naal-dialog--with-next-day" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
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
                singleBird ? "jamam-segments-table--home-compact" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <thead>
                <tr>
                  {appendNextDayMorning ? (
                    <th scope="col" className="jamam-segments-table__segment-number-col">
                      <BilingualText text={UI.antharaJamam} />
                    </th>
                  ) : null}
                  <th scope="col" className="jamam-segments-table__segment-time-col">
                    <BilingualText text={UI.naalTime} />
                  </th>
                  {birdActivityRows.map((row) => {
                    const highlighted = !singleBird && row.patchi === patchi;
                    return (
                      <th
                        key={row.patchi}
                        scope="col"
                        className={
                          highlighted ? "jamam-segments-table__col--highlight" : undefined
                        }
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
                {columns.map((column, index) => {
                  const isNextDayRow =
                    appendNextDayMorning && index >= ANTHARA_DAY_SEGMENT_COUNT;
                  const nextDayYama = index - ANTHARA_DAY_SEGMENT_COUNT + 1;

                  return (
                    <tr key={column.segmentIndex}>
                      {appendNextDayMorning ? (
                        <th scope="row" className="jamam-segments-table__segment-number-col">
                          <span className="jamam-segments-table__jamam-label">
                            <BilingualText
                              text={
                                isNextDayRow
                                  ? antharaMorningJamamHeader(nextDayYama)
                                  : {
                                      ta: String(index + 1),
                                      en: String(index + 1),
                                    }
                              }
                            />
                          </span>
                        </th>
                      ) : null}
                      <td className="jamam-segments-table__segment-time-col">
                        <span className="jamam-segments-table__jamam-time">
                          {singleBird && !appendNextDayMorning
                            ? `${index + 1} -- ${column.startTimeLabel}`
                            : column.startTimeLabel}
                        </span>
                      </td>
                      {birdActivityRows.map((row) => {
                        const cellActivity = row.activities[index] ?? "—";
                        const highlighted = !singleBird && row.patchi === patchi;
                        return (
                          <td
                            key={`${column.segmentIndex}-${row.patchi}`}
                            className={
                              highlighted ? "jamam-segments-table__col--highlight" : undefined
                            }
                          >
                            {cellActivity === "—" ? (
                              "—"
                            ) : (
                              <InlineEmojiLabel text={displayActivityBi(cellActivity)} />
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
      </div>
    </div>
  );
}
