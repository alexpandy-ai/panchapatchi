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
  antharaColumnRowLabel,
  antharaJamamHeader,
  antharaMorningJamamHeader,
  PANCHA_ACTIVITY_TA,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import { ALTERNATE_NIGHT_ACTIVITY_TA } from "../utils/alternateCalculation";
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
  /** When true, keep the start activity on every Naal slot instead of cycling. */
  repeatActivity?: boolean;
  /** Night Naal: rows 6–10 = next Thithi day jamams (yama-rotated). */
  appendNextDayMorning?: boolean;
  nextDayMorningByBird?: { patchi: string; activities: string[] }[];
  /** Next-day morning → Naal: rows 1–5 day cycle, 6–10 that day’s night jamams. */
  appendNextDayNight?: boolean;
  nextDayNightByBird?: { patchi: string; activities: string[] }[];
  /** Day anthara → Naal: rows 6–10 = same-day night jamams (yama-rotated). */
  appendNightJamam?: boolean;
  nightJamamByBird?: { patchi: string; activities: string[] }[];
  /** Display serials for rows 6–10 (morning yamas or night jamam indices). */
  appendedJamamSerials?: number[];
  /** Display serials for rows 1–5 (clicked period jamams, same as Antharam). */
  antharaJamamSerials?: number[];
  onClose: () => void;
  /** Home-only presentation; does not change dialog data or click behavior. */
  homeLayout?: boolean;
}

function naalCycleActivities(startActivity: string, period: PeriodId, count: number): string[] {
  if (startActivity === "—" || startActivity === "") {
    return Array.from({ length: count }, () => "—");
  }
  // Day Scheduler night uses Die→Sleep→Rule→Walk→Eat; day uses Pancha day order.
  const order =
    period === "day" ? PANCHA_ACTIVITY_TA : ALTERNATE_NIGHT_ACTIVITY_TA;
  return antharaActivitiesFrom(startActivity, count, order);
}

function fillDash(count: number): string[] {
  return Array.from({ length: count }, () => "—");
}

function appendedPart(
  provided: string[] | undefined,
): string[] {
  return provided && provided.length >= ANTHARA_DAY_SEGMENT_COUNT
    ? provided.slice(0, ANTHARA_DAY_SEGMENT_COUNT)
    : fillDash(ANTHARA_DAY_SEGMENT_COUNT);
}

function naalActivitiesForBird(
  startActivity: string,
  period: PeriodId,
  repeatActivity: boolean,
  appendNextDayMorning: boolean,
  nextDayMorningActivities: string[] | undefined,
  appendNextDayNight: boolean,
  nextDayNightActivities: string[] | undefined,
  appendNightJamam: boolean,
  nightJamamActivities: string[] | undefined,
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
    return [...antharaPart, ...appendedPart(nextDayMorningActivities)];
  }
  if (appendNextDayNight) {
    const dayPart = naalCycleActivities(startActivity, "day", ANTHARA_DAY_SEGMENT_COUNT);
    return [...dayPart, ...appendedPart(nextDayNightActivities)];
  }
  if (appendNightJamam) {
    const antharaPart = naalCycleActivities(
      startActivity,
      period,
      ANTHARA_DAY_SEGMENT_COUNT,
    );
    return [...antharaPart, ...appendedPart(nightJamamActivities)];
  }
  return naalCycleActivities(startActivity, period, JAMAM_ANTHARA_SEGMENT_COUNT);
}

function naalRowLabel(
  index: number,
  appendNextDayMorning: boolean,
  appendNextDayNight: boolean,
  appendNightJamam: boolean,
  appendedJamamSerials: number[] | undefined,
  antharaJamamSerials: number[] | undefined,
): Bilingual {
  const displaySerial = index + 1;

  if (index < ANTHARA_DAY_SEGMENT_COUNT) {
    const jamamNumber = antharaJamamSerials?.[index] ?? displaySerial;
    return antharaColumnRowLabel(displaySerial, antharaJamamHeader(jamamNumber));
  }

  const serialOffset = index - ANTHARA_DAY_SEGMENT_COUNT;
  const jamamValue =
    appendedJamamSerials?.[serialOffset] ??
    (appendNextDayMorning
      ? serialOffset + 1
      : appendNextDayNight || appendNightJamam
        ? ANTHARA_DAY_SEGMENT_COUNT + serialOffset + 1
        : index + 1);

  const jamamLabel = appendNextDayMorning
    ? antharaMorningJamamHeader(jamamValue)
    : antharaJamamHeader(jamamValue);

  return antharaColumnRowLabel(displaySerial, jamamLabel);
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
  appendNightJamam = false,
  nightJamamByBird,
  appendedJamamSerials,
  antharaJamamSerials,
  onClose,
  homeLayout = false,
}: NaalDialogProps) {
  const singleBird = birdRows.length <= 1;
  const showSplitLabels = appendNextDayMorning || appendNextDayNight || appendNightJamam;
  const showSerialColumn = showSplitLabels || homeLayout;
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
        const sameDayNight = nightJamamByBird?.find((entry) => entry.patchi === row.patchi);
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
            appendNightJamam,
            sameDayNight?.activities,
          ),
        };
      }),
    [
      appendNextDayMorning,
      appendNextDayNight,
      appendNightJamam,
      birdRows,
      nextDayMorningByBird,
      nextDayNightByBird,
      nightJamamByBird,
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
      className={[
        "anthara-dialog-overlay",
        "naal-dialog-overlay",
        homeLayout ? "anthara-dialog-overlay--home" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={[
          "anthara-dialog",
          "naal-dialog",
          singleBird ? "naal-dialog--single" : "naal-dialog--all-birds",
          showSplitLabels ? "naal-dialog--with-next-day" : "",
          homeLayout ? "anthara-dialog--home naal-dialog--home" : "",
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
                singleBird ? "jamam-segments-table--single-bird" : "",
                showSerialColumn ? "" : "jamam-segments-table--time-first",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <colgroup>
                {showSerialColumn ? (
                  <col className="jamam-segments-table__col-segment-number" />
                ) : null}
                <col className="jamam-segments-table__col-segment-time" />
                {birdActivityRows.map((row) => (
                  <col key={`col-${row.patchi}`} className="jamam-segments-table__col-patchi" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {showSerialColumn ? (
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
                    {showSerialColumn ? (
                      <th scope="row" className="jamam-segments-table__segment-number-col">
                        <span className="jamam-segments-table__jamam-label">
                          <BilingualText
                            text={naalRowLabel(
                              index,
                              appendNextDayMorning,
                              appendNextDayNight,
                              appendNightJamam,
                              appendedJamamSerials,
                              antharaJamamSerials,
                            )}
                          />
                        </span>
                      </th>
                    ) : null}
                    <td className="jamam-segments-table__segment-time-col">
                      <span className="jamam-segments-table__jamam-time">
                        {column.startTimeLabel}
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
