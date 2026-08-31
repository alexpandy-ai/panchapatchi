import { Fragment, useState } from "react";

import { BilingualText } from "./BilingualText";
import { JamamSegmentsPanel } from "./JamamSegmentsPanel";

import type { PatchiSchedule, PatchiSchedulesBundle } from "../utils/patchi";

import { isActiveJamamColumn, isActivePeriodCell } from "../utils/patchi";

import type { PeriodId } from "../utils/jamam";

import { jamamIndexForYama } from "../utils/jamam";

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

}



interface SelectedJamamCell {

  groupKey: string;

  yama: number;

}



export function PatchiScheduleTable({ bundle, title, subtitle }: PatchiScheduleTableProps) {

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

              />

              <PeriodPivotTable

                schedule={schedule}

                period="night"

                title={sectionLabelBilingual(schedule.nightSectionLabel)}

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

}: {

  schedule: PatchiSchedule;

  period: PeriodId;

  title: Bilingual;

}) {

  const [selectedCell, setSelectedCell] = useState<SelectedJamamCell | null>(null);

  const timeKey = period === "day" ? "dayTimeRange" : "nightTimeRange";

  const startKey = period === "day" ? "dayStart" : "nightStart";

  const endKey = period === "day" ? "dayEnd" : "nightEnd";

  const columnCount = schedule.jamamColumns.length + 1;



  const toggleCell = (groupKey: string, yama: number) => {

    setSelectedCell((current) =>

      current?.groupKey === groupKey && current.yama === yama ? null : { groupKey, yama },

    );

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

                <BilingualText text={UI.patchi} />

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

            {schedule.dayRows.map((row) => {

              const expandedCell =

                selectedCell?.groupKey === row.groupKey ? selectedCell : null;

              const expandedColumn = expandedCell

                ? schedule.jamamColumns.find((column) => column.yama === expandedCell.yama)

                : null;



              return (

                <Fragment key={row.groupKey}>

                  <tr>

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

                            onClick={() => toggleCell(row.groupKey, column.yama)}

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

                  {expandedColumn && expandedCell && (

                    <tr className="patchi-pivot-table__detail-row">

                      <td colSpan={columnCount}>

                        <JamamSegmentsPanel

                          start={expandedColumn[startKey]}

                          end={expandedColumn[endKey]}

                          activity={

                            (period === "day" ? row.dayCells : row.nightCells)[

                              schedule.jamamColumns.findIndex(

                                (column) => column.yama === expandedCell.yama,

                              )

                            ] ?? "—"

                          }

                          bird={

                            getPakshaGroupPatchiBilingual(schedule.pakshaId, row.groupKey).ta

                          }

                          onClose={() => setSelectedCell(null)}

                        />

                      </td>

                    </tr>

                  )}

                </Fragment>

              );

            })}

          </tbody>

        </table>

      </div>

    </div>

  );

}


