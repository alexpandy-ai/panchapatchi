import { useState } from "react";

import { BilingualText } from "./BilingualText";
import { JamamAntharaDialog } from "./JamamAntharaDialog";

import type { PatchiSchedule, PatchiSchedulesBundle } from "../utils/patchi";

import { isActiveJamamColumn, isActivePeriodCell, jamamActivitySlotsKey } from "../utils/patchi";

import type { PeriodId } from "../utils/jamam";

import { jamamIndexForYama, getPreviousJamamSlotForIndex } from "../utils/jamam";

import type { GeoCoords } from "../utils/location";

import { displayActivityBi } from "../utils/activityLabel";

import { getPakshaGroupPatchiBilingual } from "../utils/dayGroup";

import {
  jamamBilingual,
  pakshaLabelBilingual,
  sectionLabelBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";

interface PatchiScheduleTableProps {
  bundle: PatchiSchedulesBundle;
  title: Bilingual;
  subtitle?: Bilingual;
  coords: GeoCoords | null;
}

interface SelectedJamamCell {
  groupKey: string;
  yama: number;
}

export function PatchiScheduleTable({
  bundle,
  title,
  subtitle,
  coords,
}: PatchiScheduleTableProps) {
  return (
    <section className="schedule-table-card">
      <div className="patchi-schedule-head">
        <h3 className="schedule-table-card__title">
          <BilingualText text={title} />
        </h3>
        {subtitle && (
          <p className="patchi-schedule-head__meta">
            <BilingualText text={subtitle} />
          </p>
        )}
      </div>

      <div className="patchi-paksha-sections">
        {bundle.schedules.map((schedule) => (
          <div key={schedule.pakshaId} className="patchi-paksha-section">
            <div className="patchi-paksha-section__head">
              <h4 className="patchi-paksha-section__title">
                <BilingualText text={pakshaLabelBilingual(schedule.pakshaId)} />
              </h4>
              {schedule.isActivePaksha && (
                <span className="patchi-paksha-section__badge">
                  <BilingualText text={UI.selectedDate} />
                </span>
              )}
            </div>

            <div className="patchi-pivot-tables">
              <PeriodPivotTable
                schedule={schedule}
                period="day"
                title={sectionLabelBilingual(schedule.daySectionLabel)}
                coords={coords}
              />
              <PeriodPivotTable
                schedule={schedule}
                period="night"
                title={sectionLabelBilingual(schedule.nightSectionLabel)}
                coords={coords}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PeriodPivotTable({
  schedule,
  period,
  title,
  coords,
}: {
  schedule: PatchiSchedule;
  period: PeriodId;
  title: Bilingual;
  coords: GeoCoords | null;
}) {
  const [selectedCell, setSelectedCell] = useState<SelectedJamamCell | null>(null);
  const timeKey = period === "day" ? "dayTimeRange" : "nightTimeRange";
  const startKey = period === "day" ? "dayStart" : "nightStart";
  const endKey = period === "day" ? "dayEnd" : "nightEnd";

  const selectedColumn = selectedCell
    ? schedule.jamamColumns.find((column) => column.yama === selectedCell.yama)
    : null;
  const selectedJamamSlots = selectedCell
    ? schedule.jamamActivitySlots[jamamActivitySlotsKey(selectedCell.groupKey, selectedCell.yama)]
    : null;
  const selectedRow = selectedCell
    ? schedule.dayRows.find((row) => row.groupKey === selectedCell.groupKey)
    : null;
  const selectedActivity =
    selectedRow && selectedColumn && selectedCell
      ? (period === "day" ? selectedRow.dayCells : selectedRow.nightCells)[
          schedule.jamamColumns.findIndex((column) => column.yama === selectedCell.yama)
        ] ?? "—"
      : "—";

  const openDialog = !!(selectedCell && selectedColumn && selectedJamamSlots);

  const previousJamamSlot =
    selectedCell && selectedColumn
      ? getPreviousJamamSlotForIndex(
          jamamIndexForYama(selectedCell.yama, period),
          selectedColumn[period === "day" ? "dayStart" : "nightStart"],
          coords,
        )
      : null;

  const openCell = (groupKey: string, yama: number) => {
    setSelectedCell({ groupKey, yama });
  };

  return (
    <div className="patchi-pivot-section">
      <h5 className="patchi-pivot-section__title">
        <BilingualText text={title} />
      </h5>
      <div className="sheet-table-wrap patchi-pivot-wrap">
        <table className="sheet-table patchi-pivot-table">
          <thead>
            <tr>
              <th className="patchi-pivot-table__day-col">
                <BilingualText text={UI.athikaraPatchi} />
                <span className="patchi-pivot-table__time">
                  <BilingualText text={UI.day} />
                </span>
              </th>
              {schedule.jamamColumns.map((column) => (
                <th
                  key={column.yama}
                  className={
                    isActiveJamamColumn(schedule.activeCell, column.yama, period)
                      ? "patchi-pivot-table__col--active"
                      : ""
                  }
                >
                  <span className="patchi-pivot-table__jamam">
                    <BilingualText text={jamamBilingual(jamamIndexForYama(column.yama, period))} />
                  </span>
                  <span className="patchi-pivot-table__time">{column[timeKey]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.dayRows.map((row) => (
              <tr key={row.groupKey}>
                <td className="patchi-pivot-table__day">
                  <BilingualText
                    text={getPakshaGroupPatchiBilingual(schedule.pakshaId, row.groupKey)}
                  />
                </td>
                {(period === "day" ? row.dayCells : row.nightCells).map((status, index) => {
                  const column = schedule.jamamColumns[index];
                  if (!column) return null;

                  const active = isActivePeriodCell(
                    schedule.activeCell,
                    row.groupKey,
                    column.yama,
                    period,
                  );
                  const isSelected =
                    selectedCell?.groupKey === row.groupKey &&
                    selectedCell.yama === column.yama;

                  return (
                    <td
                      key={column.yama}
                      className={[
                        active ? "patchi-pivot-table__cell--current" : "",
                        isSelected ? "patchi-pivot-table__cell--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className="patchi-pivot-table__cell-btn"
                        aria-expanded={isSelected}
                        onClick={() => openCell(row.groupKey, column.yama)}
                      >
                        <span className="patchi-pivot-table__status">
                          {status === "—" ? (
                            "—"
                          ) : (
                            <BilingualText text={displayActivityBi(status)} />
                          )}
                        </span>
                        {active && (
                          <span className="schedule-table__badge schedule-table__badge--cell">
                            <BilingualText text={UI.now} />
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openDialog && selectedColumn && selectedJamamSlots ? (
        <JamamAntharaDialog
          open={openDialog}
          start={selectedColumn[startKey]}
          end={selectedColumn[endKey]}
          activity={selectedActivity}
          dayJamamSlots={selectedJamamSlots.day}
          nightJamamSlots={selectedJamamSlots.night}
          previousJamamStart={previousJamamSlot?.start}
          previousJamamEnd={previousJamamSlot?.end}
          previousJamamIndex={previousJamamSlot?.index}
          jamamIndex={jamamIndexForYama(selectedCell.yama, period)}
          onClose={() => setSelectedCell(null)}
        />
      ) : null}
    </div>
  );
}
