import type { ScheduleGrid } from "../utils/patchi";
import { isActivePeriodCell } from "../utils/patchi";

interface ScheduleGridTableProps {
  grid: ScheduleGrid;
  title: string;
  subtitle?: string;
  emptyCell?: string;
}

export function ScheduleGridTable({ grid, title, subtitle, emptyCell = "—" }: ScheduleGridTableProps) {
  return (
    <section className="schedule-table-card">
      <div className="patchi-schedule-head">
        <h3 className="schedule-table-card__title">{title}</h3>
        {subtitle && <p className="patchi-schedule-head__meta">{subtitle}</p>}
      </div>

      <div className="sheet-table-wrap">
        <table className="sheet-table schedule-grid-table">
          <thead>
            <tr>
              <th rowSpan={2}>ஜாமம்</th>
              <th rowSpan={2}>பகல் நேரம்</th>
              <th colSpan={grid.dayActivities.length}>{grid.daySectionLabel}</th>
              <th rowSpan={2}>இரவு நேரம்</th>
              <th colSpan={grid.nightActivities.length}>{grid.nightSectionLabel}</th>
            </tr>
            <tr>
              {grid.dayActivities.map((activity) => (
                <th key={`day-head-${activity}`}>{activity}</th>
              ))}
              {grid.nightActivities.map((activity) => (
                <th key={`night-head-${activity}`}>{activity}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr
                key={row.yama}
                className={
                  grid.activeCell &&
                  grid.activeCell.groupKey === grid.groupKey &&
                  grid.activeCell.yama === row.yama
                    ? "schedule-grid-table__row--active"
                    : ""
                }
              >
                <td className="sheet-table__yama">
                  {row.yamaLabel}
                  {(row.dayJamamActive || row.nightJamamActive) && (
                    <span className="schedule-table__badge schedule-table__badge--inline">நடப்பில்</span>
                  )}
                </td>
                <td className="schedule-grid-table__time">{row.dayTimeRange}</td>
                {row.dayBirds.map((bird, index) => (
                  <GridCell
                    key={`day-${row.yama}-${index}`}
                    value={bird || emptyCell}
                    active={isActivePeriodCell(grid.activeCell, grid.groupKey, row.yama, "day")}
                  />
                ))}
                <td className="schedule-grid-table__time">{row.nightTimeRange}</td>
                {row.nightBirds.map((bird, index) => (
                  <GridCell
                    key={`night-${row.yama}-${index}`}
                    value={bird || emptyCell}
                    active={isActivePeriodCell(grid.activeCell, grid.groupKey, row.yama, "night")}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GridCell({ value, active }: { value: string; active: boolean }) {
  return (
    <td className={active ? "schedule-grid-table__cell--current" : ""}>
      {value}
      {active && <span className="schedule-table__badge schedule-table__badge--cell">நடப்பில்</span>}
    </td>
  );
}
