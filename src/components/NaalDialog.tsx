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
  antharaJamamHeader,
  antharaMorningJamamHeader,
  JAMAM_ACTIVITY_TA,
  PANCHA_ACTIVITY_TA,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
  type Bilingual,
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
  /** Jamam-level night rows on day Anthara: same activity on every Naal slot. */
  repeatActivity?: boolean;
  /** Night Naal: rows 6–10 = next Thithi day jamams 1–5. */
  appendNextDayMorning?: boolean;
  nextDayMorningByBird?: { patchi: string; activities: string[] }[];
  /** Next-day morning → Naal: rows 1–5 day cycle, 6–10 that day’s night jamams. */
  appendNextDayNight?: boolean;
  nextDayNightByBird?: { patchi: string; activities: string[] }[];
  onClose: () => void;
}

function naalCycleActivities(startActivity: string, period: PeriodId, count: number): string[] {
  if (startActivity === "—" || startActivity === "") {
    return Array.from({ length: count }, () => "—");
  }
  const order = period === "day" ? PANCHA_ACTIVITY_TA : JAMAM_ACTIVITY_TA;
  return antharaActivitiesFrom(startActivity, count, order);
}

function fillDash(count: number): string[] {
  return Array.from({ length: count }, () => "—");
}

function naalActivitiesForBird(
  startActivity: string,
  period: PeriodId,
  repeatActivity: boolean,
  appendNextDayMorning: boolean,
  nextDayMorningActivities: string[] | undefined,
  appendNextDayNight: boolean,
  nextDayNightActivities: string[] | undefined,
): string[] {
  if (startActivity === "—" || startActivity === "") {
    return fillDash(JAMAM_ANTHARA_SEGMENT_COUNT);
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
        : fillDash(ANTHARA_DAY_SEGMENT_COUNT);
    return [...antharaPart, ...morningPart];
  }
  if (appendNextDayNight) {
    const dayPart = naalCycleActivities(startActivity, "day", ANTHARA_DAY_SEGMENT_COUNT);
    const nightPart =
      nextDayNightActivities && nextDayNightActivities.length >= ANTHARA_DAY_SEGMENT_COUNT
        ? nextDayNightActivities.slice(0, ANTHARA_DAY_SEGMENT_COUNT)
        : fillDash(ANTHARA_DAY_SEGMENT_COUNT);
    return [...dayPart, ...nightPart];
  }
  return naalCycleActivities(startActivity, period, JAMAM_ANTHARA_SEGMENT_COUNT);
}

function naalRowLabel(
  index: number,
  appendNextDayMorning: boolean,
  appendNextDayNight: boolean,
): Bilingual {
  if (appendNextDayMorning && index >= ANTHARA_DAY_SEGMENT_COUNT) {
    return antharaMorningJamamHeader(index - ANTHARA_DAY_SEGMENT_COUNT + 1);
  }
  if (appendNextDayNight && index >= ANTHARA_DAY_SEGMENT_COUNT) {
    return antharaJamamHeader(index + 1); // jamam 6–10
  }
  return { ta: String(index + 1), en: String(index + 1) };
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
  appendNextDayNight = false,
  nextDayNightByBird,
  onClose,
}: NaalDialogProps) {
  const singleBird = birdRows.length <= 1;
  const showSplitLabels = appendNextDayMorning || appendNextDayNight;
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
        const night = nextDayNightByBird?.find((entry) => entry.patchi === row.patchi);
        return {
          patchi: row.patchi,
          activities: naalActivitiesForBird(
            row.activity,
            period,
            repeatActivity,
            appendNextDayMorning,
            morning?.activities,
            appendNextDayNight,
            night?.activities,
          ),
        };
      }),
    [
      appendNextDayMorning,
      appendNextDayNight,
      birdRows,
      nextDayMorningByBird,
      nextDayNightByBird,
      period,
      repeatActivity,
    ],
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
          showSplitLabels ? "naal-dialog--with-next-day" : "",
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
                  {showSplitLabels ? (
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
                {columns.map((column, index) => (
                  <tr key={column.segmentIndex}>
                    {showSplitLabels ? (
                      <th scope="row" className="jamam-segments-table__segment-number-col">
                        <span className="jamam-segments-table__jamam-label">
                          <BilingualText
                            text={naalRowLabel(
                              index,
                              appendNextDayMorning,
                              appendNextDayNight,
                            )}
                          />
                        </span>
                      </th>
                    ) : null}
                    <td className="jamam-segments-table__segment-time-col">
                      <span className="jamam-segments-table__jamam-time">
                        {singleBird && !showSplitLabels
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
