import { Fragment, useEffect, useMemo, useRef } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import { getDayGroupLabelBilingual, sortGroupsForSheetDisplay } from "../utils/dayGroup";
import type { ActivitySlot, PakshaData, YamaRow } from "../types";
import type { PakshaId } from "../utils/paksha";
import { displayActivity } from "../utils/activityLabel";
import {
  formatPatchiName,
  jamamBilingualForYama,
  PANCHA_ACTIVITIES,
  patchiBilingual,
  sectionLabelBilingual,
  UI,
} from "../utils/bilingual";
import { formatTimeRange, getFullDayJamamSchedule, getJamamState, jamamIndexForYama, type PeriodId } from "../utils/jamam";

function slotForActivity(slots: ActivitySlot[], activityTa: string): ActivitySlot | undefined {
  return slots.find((slot) => displayActivity(slot.activity) === activityTa);
}

function eatingBirdForYama(yama: YamaRow): string | null {
  const eatingSlot =
    yama.day.find((slot) => displayActivity(slot.activity) === "ஊண்") ?? yama.day[0];
  return eatingSlot?.bird ?? null;
}

function isSamePatchi(a: string, b: string): boolean {
  return formatPatchiName(a) === formatPatchiName(b);
}

interface SheetTableProps {
  data: PakshaData;
  pakshaId: PakshaId;
  referenceDate: Date;
  highlightPatchi?: string | null;
}

export function SheetTable({ data, pakshaId, referenceDate, highlightPatchi }: SheetTableProps) {
  const { coords } = useLocation();
  const { all: jamamSlots } = getFullDayJamamSchedule(referenceDate, coords);
  const jamam = getJamamState(referenceDate, coords);
  const groups = sortGroupsForSheetDisplay(pakshaId, data.groups);
  const rowsPerGroup = groups[0]?.yamas.length ?? 5;
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const highlightGroupKey = useMemo(() => {
    if (!highlightPatchi) return null;
    for (const group of groups) {
      const eatingBird = eatingBirdForYama(group.yamas[0]);
      if (eatingBird && isSamePatchi(eatingBird, highlightPatchi)) {
        return group.key;
      }
    }
    return null;
  }, [groups, highlightPatchi]);

  useEffect(() => {
    if (!highlightGroupKey || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightGroupKey, pakshaId]);

  const groupRowClass = (groupKey: string, base = ""): string => {
    const highlight =
      highlightGroupKey === groupKey ? " sheet-table__group-row--highlight" : "";
    return `${base}${highlight}`.trim();
  };

  const jamamRowClass = (
    groupKey: string,
    yama: number,
    period: PeriodId,
    base = "",
  ): string => {
    const isActiveJamam =
      highlightGroupKey === groupKey &&
      jamam.yamaIndex === yama &&
      jamam.period === period;
    const jamamHighlight = isActiveJamam ? " sheet-table__yama-row--active" : "";
    return `${groupRowClass(groupKey, base)}${jamamHighlight}`.trim();
  };

  return (
    <div className="sheet-table-wrap">
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="sheet-table__corner">
              <BilingualText text={UI.patchi} />
            </th>
            <th>
              <BilingualText text={UI.jamam} />
            </th>
            {PANCHA_ACTIVITIES.map((activity) => (
              <th key={`day-${activity.ta}`}>
                <BilingualText text={activity} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const eatingBird = eatingBirdForYama(group.yamas[0]);
            const totalRows = rowsPerGroup * 2 + 2;
            const isHighlightGroup = highlightGroupKey === group.key;

            return (
              <Fragment key={group.key}>
                <tr
                  className={groupRowClass(group.key, "sheet-table__period-label")}
                  ref={isHighlightGroup ? highlightRef : undefined}
                >
                  <td rowSpan={totalRows} className="sheet-table__group">
                    <BilingualText
                      text={
                        eatingBird
                          ? patchiBilingual(eatingBird)
                          : getDayGroupLabelBilingual(group.key)
                      }
                    />
                  </td>
                  <td className="sheet-table__period-label-cell">
                    <BilingualText text={sectionLabelBilingual(data.daySectionLabel)} />
                  </td>
                  {PANCHA_ACTIVITIES.map((activity) => (
                    <td
                      key={`${group.key}-day-label-${activity.ta}`}
                      className="sheet-table__period-spacer"
                    />
                  ))}
                </tr>

                {group.yamas.map((yama) => {
                  const daySlot = jamamSlots.find(
                    (slot) => slot.index === jamamIndexForYama(yama.yama, "day"),
                  )!;

                  return (
                    <tr
                      key={`${group.key}-day-${yama.yama}`}
                      className={jamamRowClass(group.key, yama.yama, "day")}
                    >
                      <td className="sheet-table__yama">
                        <BilingualText text={jamamBilingualForYama(yama.yama, "day")} />
                        <span className="sheet-table__jamam-time">
                          {formatTimeRange(daySlot.start, daySlot.end)}
                        </span>
                      </td>
                      {PANCHA_ACTIVITIES.map((activity) => {
                        const slot = slotForActivity(yama.day, activity.ta);
                        return (
                          <td key={`${yama.yama}-day-${activity.ta}`}>
                            {slot?.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr className={groupRowClass(group.key, "sheet-table__period-label")}>
                  <td className="sheet-table__period-label-cell">
                    <BilingualText text={sectionLabelBilingual(data.nightSectionLabel)} />
                  </td>
                  {PANCHA_ACTIVITIES.map((activity) => (
                    <td
                      key={`${group.key}-night-label-${activity.ta}`}
                      className="sheet-table__period-spacer"
                    />
                  ))}
                </tr>

                {group.yamas.map((yama) => {
                  const nightSlot = jamamSlots.find(
                    (slot) => slot.index === jamamIndexForYama(yama.yama, "night"),
                  )!;

                  return (
                    <tr
                      key={`${group.key}-night-${yama.yama}`}
                      className={jamamRowClass(group.key, yama.yama, "night")}
                    >
                      <td className="sheet-table__yama">
                        <BilingualText text={jamamBilingualForYama(yama.yama, "night")} />
                        <span className="sheet-table__jamam-time">
                          {formatTimeRange(nightSlot.start, nightSlot.end)}
                        </span>
                      </td>
                      {PANCHA_ACTIVITIES.map((activity) => {
                        const slot = slotForActivity(yama.night, activity.ta);
                        return (
                          <td key={`${yama.yama}-night-${activity.ta}`}>
                            {slot?.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
