import { Fragment } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import { getDayGroupLabelBilingual } from "../utils/dayGroup";
import type { PakshaData, YamaRow } from "../types";
import { displayActivity, displayActivityBi } from "../utils/activityLabel";
import { jamamBilingualForYama, patchiBilingual, sectionLabelBilingual, UI } from "../utils/bilingual";
import { formatTimeRange, getFullDayJamamSchedule, jamamIndexForYama } from "../utils/jamam";

function eatingBirdForYama(yama: YamaRow): string | null {
  const eatingSlot =
    yama.day.find((slot) => displayActivity(slot.activity) === "ஊண்") ?? yama.day[0];
  return eatingSlot?.bird ?? null;
}

interface SheetTableProps {
  data: PakshaData;
  referenceDate: Date;
}

export function SheetTable({ data, referenceDate }: SheetTableProps) {
  const { coords } = useLocation();
  const { all: jamamSlots } = getFullDayJamamSchedule(referenceDate, coords);
  const rowsPerGroup = data.groups[0]?.yamas.length ?? 5;

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
            {data.dayActivities.map((activity) => (
              <th key={`day-${activity}`}>
                <BilingualText text={displayActivityBi(activity)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.groups.map((group) => {
            const eatingBird = eatingBirdForYama(group.yamas[0]);
            const totalRows = rowsPerGroup * 2 + 2;

            return (
              <Fragment key={group.key}>
                <tr className="sheet-table__period-label">
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
                  {data.dayActivities.map((activity) => (
                    <td key={`${group.key}-day-label-${activity}`} className="sheet-table__period-spacer" />
                  ))}
                </tr>

                {group.yamas.map((yama) => {
                  const daySlot = jamamSlots.find(
                    (slot) => slot.index === jamamIndexForYama(yama.yama, "day"),
                  )!;

                  return (
                    <tr key={`${group.key}-day-${yama.yama}`}>
                      <td className="sheet-table__yama">
                        <BilingualText text={jamamBilingualForYama(yama.yama, "day")} />
                        <span className="sheet-table__jamam-time">
                          {formatTimeRange(daySlot.start, daySlot.end)}
                        </span>
                      </td>
                      {yama.day.map((slot, idx) => (
                        <td key={`${yama.yama}-day-${idx}`}>
                          {slot.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                <tr className="sheet-table__period-label">
                  <td className="sheet-table__period-label-cell">
                    <BilingualText text={sectionLabelBilingual(data.nightSectionLabel)} />
                  </td>
                  {data.nightActivities.map((activity) => (
                    <td key={`${group.key}-night-label-${activity}`} className="sheet-table__period-spacer" />
                  ))}
                </tr>

                {group.yamas.map((yama) => {
                  const nightSlot = jamamSlots.find(
                    (slot) => slot.index === jamamIndexForYama(yama.yama, "night"),
                  )!;

                  return (
                    <tr key={`${group.key}-night-${yama.yama}`}>
                      <td className="sheet-table__yama">
                        <BilingualText text={jamamBilingualForYama(yama.yama, "night")} />
                        <span className="sheet-table__jamam-time">
                          {formatTimeRange(nightSlot.start, nightSlot.end)}
                        </span>
                      </td>
                      {yama.night.map((slot, idx) => (
                        <td key={`${yama.yama}-night-${idx}`}>
                          {slot.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}
                        </td>
                      ))}
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
