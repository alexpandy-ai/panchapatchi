import { BilingualText } from "./BilingualText";
import { PatchiFilterChips, type PatchiSelection } from "./PatchiPickerBlock";
import { useNavigation } from "../context/NavigationContext";

import type { PatchiSchedule, PatchiSchedulesBundle } from "../utils/patchi";

import {
  isActiveJamamColumn,
  isActivePeriodCell,
} from "../utils/patchi";

import type { PeriodId } from "../utils/jamam";

import { jamamIndexForYama } from "../utils/jamam";

import { displayActivityBi } from "../utils/activityLabel";

import { getPakshaGroupPatchiBilingual } from "../utils/dayGroup";

import {
  jamamBilingual,
  PATCHI_ORDER,
  patchiBilingual,
  PAKSHA_BI,
  periodAthikaraPatchiHeader,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";

const SHEET_TABS: { id: PakshaId; label: (typeof PAKSHA_BI)[PakshaId] }[] = [
  { id: "valarpirai", label: PAKSHA_BI.valarpirai },
  { id: "theipirai", label: PAKSHA_BI.theipirai },
];

type PatchiName = (typeof PATCHI_ORDER)[number];

interface PatchiScheduleTableProps {
  bundle: PatchiSchedulesBundle | null;
  allBundles?: { patchiName: PatchiName; bundle: PatchiSchedulesBundle }[];
  selectedPatchi: PatchiSelection;
  onSelectPatchi: (patchi: PatchiSelection) => void;
  subtitle?: Bilingual;
}

export function PatchiScheduleTable({
  bundle,
  allBundles,
  selectedPatchi,
  onSelectPatchi,
  subtitle,
}: PatchiScheduleTableProps) {
  const activeBundle = bundle ?? allBundles?.[0]?.bundle ?? null;
  const { paksha: activePaksha, setPaksha: setActivePaksha } = useNavigation();

  if (!activeBundle) return null;

  const bundlesToRender =
    selectedPatchi === "all" && allBundles?.length
      ? allBundles
      : activeBundle
        ? [{ patchiName: activeBundle.patchiName as PatchiName, bundle: activeBundle }]
        : [];

  return (
    <section className="schedule-table-card">
      {subtitle ? (
        <div className="patchi-schedule-head">
          <p className="patchi-schedule-head__meta">
            <BilingualText text={subtitle} />
          </p>
        </div>
      ) : null}
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

      <PatchiFilterChips
        selected={selectedPatchi}
        onSelect={onSelectPatchi}
        ariaLabel={`${UI.selectOurPatchi.ta} ${UI.selectOurPatchi.en}`}
      />

      {bundlesToRender.map(({ patchiName, bundle: patchiBundle }) => {
        const schedule =
          patchiBundle.schedules.find((entry) => entry.pakshaId === activePaksha) ??
          patchiBundle.schedules[0];

        if (!schedule) return null;

        return (
          <div key={patchiName} className="patchi-schedule-patchi-section">
            <h4
              className={
                selectedPatchi === "all"
                  ? "patchi-schedule-patchi-section__title"
                  : "patchi-schedule-patchi-section__title patchi-schedule-patchi-section__title--centered"
              }
            >
              <BilingualText text={patchiBilingual(patchiName)} />
            </h4>
            <div className="patchi-pivot-tables">
              <PeriodPivotTable schedule={schedule} period="day" />
              <PeriodPivotTable schedule={schedule} period="night" />
            </div>
          </div>
        );
      })}
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
  const timeKey = period === "day" ? "dayTimeRange" : "nightTimeRange";
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

                  return (
                    <td
                      key={column.yama}
                      className={active ? "patchi-pivot-table__cell--current" : ""}
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
