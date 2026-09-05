import { useState } from "react";

import { BilingualText } from "./BilingualText";
import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { useLocation } from "../context/LocationContext";

import type { PatchiSchedule, PatchiSchedulesBundle } from "../utils/patchi";

import { isActiveJamamColumn, isActivePeriodCell, jamamActivitySlotsKey, jamamSlotsFromColumns } from "../utils/patchi";

import type { PeriodId } from "../utils/jamam";

import { jamamIndexForYama } from "../utils/jamam";

import { displayActivityBi } from "../utils/activityLabel";

import { getPakshaGroupPatchiBilingual } from "../utils/dayGroup";

import {
  jamamBilingual,
  PAKSHA_BI,
  periodAthikaraPatchiHeader,
  UI,
} from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";

const SHEET_TABS: { id: PakshaId; label: (typeof PAKSHA_BI)[PakshaId] }[] = [
  { id: "valarpirai", label: PAKSHA_BI.valarpirai },
  { id: "theipirai", label: PAKSHA_BI.theipirai },
];

interface PatchiScheduleTableProps {
  bundle: PatchiSchedulesBundle;
}

interface SelectedJamamCell {
  groupKey: string;
  yama: number;
  thozhil: string;
}

export function PatchiScheduleTable({
  bundle,
}: PatchiScheduleTableProps) {
  const [activePaksha, setActivePaksha] = useState<PakshaId>(bundle.activePakshaId);
  const schedule =
    bundle.schedules.find((entry) => entry.pakshaId === activePaksha) ?? bundle.schedules[0];

  if (!schedule) return null;

  return (
    <section className="schedule-table-card">
      <div
        className="sheet-picker patchi-schedule-sheet-picker"
        role="tablist"
        aria-label={`${UI.sheetPicker.ta} ${UI.sheetPicker.en}`}
      >
        {SHEET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={
              activePaksha === tab.id
                ? "sheet-picker__btn sheet-picker__btn--active"
                : "sheet-picker__btn"
            }
            onClick={() => setActivePaksha(tab.id)}
            aria-selected={activePaksha === tab.id}
          >
            <span className="sheet-picker__label">
              <BilingualText text={tab.label} />
            </span>
          </button>
        ))}
      </div>

      <div className="patchi-pivot-tables">
        <PeriodPivotTable schedule={schedule} period="day" />
        <PeriodPivotTable schedule={schedule} period="night" />
      </div>
    </section>
  );
}

function PeriodPivotTable({
  schedule,
  period,
}: {
  schedule: PatchiSchedule;
  period: PeriodId;
}) {
  const { coords } = useLocation();
  const [selectedCell, setSelectedCell] = useState<SelectedJamamCell | null>(null);
  const timeKey = period === "day" ? "dayTimeRange" : "nightTimeRange";

  const selectedColumn = selectedCell
    ? schedule.jamamColumns.find((column) => column.yama === selectedCell.yama)
    : null;

  const openDialog = !!(selectedCell && selectedColumn);
  const allJamamSlots = jamamSlotsFromColumns(schedule.jamamColumns);
  const highlightJamamIndex = selectedCell
    ? jamamIndexForYama(selectedCell.yama, period)
    : 1;
  const jamamSlot = allJamamSlots.find((slot) => slot.index === highlightJamamIndex) ?? null;

  const openCell = (groupKey: string, yama: number, thozhil: string) => {
    setSelectedCell({ groupKey, yama, thozhil });
  };

  const periodHeader = periodAthikaraPatchiHeader(period);

  return (
    <div className="patchi-pivot-section">
      <div className="sheet-table-wrap patchi-pivot-wrap">
        <table className="sheet-table patchi-pivot-table">
          <thead>
            <tr>
              <th className="patchi-pivot-table__day-col">
                <span className="patchi-pivot-table__jamam">
                  <BilingualText text={periodHeader.title} />
                </span>
                <span className="patchi-pivot-table__time">
                  <BilingualText text={periodHeader.period} />
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
                        onClick={() => openCell(row.groupKey, column.yama, status)}
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

      {openDialog && selectedCell && jamamSlot ? (
        <JamamAntharaDialog
          open={openDialog}
          jamamSlot={jamamSlot}
          getActivitySlots={(yama, slotPeriod) => {
            const entry =
              schedule.jamamActivitySlots[
                jamamActivitySlotsKey(selectedCell.groupKey, yama)
              ];
            if (!entry) return [];
            return slotPeriod === "day" ? entry.day : entry.night;
          }}
          highlightPatchi={schedule.patchiName}
          highlightThozhil={selectedCell.thozhil}
          onClose={() => setSelectedCell(null)}
          coords={coords}
          jamamSlots={allJamamSlots}
        />
      ) : null}
    </div>
  );
}
