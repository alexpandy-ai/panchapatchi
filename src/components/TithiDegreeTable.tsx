import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { useLanguage } from "../context/LanguageContext";
import { useLocation } from "../context/LocationContext";
import { pickBilingual, UI } from "../utils/bilingual";
import {
  buildTithiCycleTable,
  formatDegree,
  formatDurationHHMM,
  formatTithiDate,
  formatTithiDateTime,
  formatTithiTime12,
} from "../utils/tithiCycle";

interface TithiDegreeTableProps {
  selectedDateTime: Date;
}

export function TithiDegreeTable({ selectedDateTime }: TithiDegreeTableProps) {
  const { coords } = useLocation();
  const { language } = useLanguage();

  const table = useMemo(
    () => buildTithiCycleTable(selectedDateTime, coords),
    [selectedDateTime, coords],
  );

  const { current, rows, timeZone } = table;

  return (
    <section className="tithi-degree" aria-label={pickBilingual(UI.tithiDegreeTable, language)}>
      <h2 className="tithi-degree__title">
        <BilingualText text={UI.tithiDegreeTable} />
      </h2>
      <p className="tithi-degree__rule">
        <BilingualText text={UI.tithiCycleHint} />
      </p>

      <div className="tithi-current-card" aria-live="polite">
        <p className="tithi-current-card__kicker">
          <BilingualText text={UI.currentTithi} />
        </p>
        <p className="tithi-current-card__name">
          <BilingualText text={current.pakshaLabel} />{" "}
          <BilingualText text={current.name} />
        </p>
        <dl className="tithi-current-card__meta">
          <div>
            <dt>
              <BilingualText text={UI.currentDegree} />
            </dt>
            <dd>{formatDegree(current.degree, 2)}</dd>
          </div>
          <div>
            <dt>
              <BilingualText text={UI.tithiStart} />
            </dt>
            <dd>{formatTithiDateTime(current.start, timeZone)}</dd>
          </div>
          <div>
            <dt>
              <BilingualText text={UI.tithiEnd} />
            </dt>
            <dd>{formatTithiDateTime(current.end, timeZone)}</dd>
          </div>
          <div>
            <dt>
              <BilingualText text={UI.remainingTime} />
            </dt>
            <dd>{formatDurationHHMM(current.remainingMs)}</dd>
          </div>
        </dl>
      </div>

      <div className="tithi-degree-table-wrap">
        <table className="tithi-degree-table">
          <thead>
            <tr>
              <th scope="col">
                <BilingualText text={UI.serialNo} />
              </th>
              <th scope="col">
                <BilingualText text={UI.paksha} />
              </th>
              <th scope="col">
                <BilingualText text={UI.tithiName} />
              </th>
              <th scope="col">
                <BilingualText text={UI.startDegree} />
              </th>
              <th scope="col">
                <BilingualText text={UI.endDegree} />
              </th>
              <th scope="col">
                <BilingualText text={UI.degreeRange} />
              </th>
              <th scope="col">
                <BilingualText text={UI.startDate} />
              </th>
              <th scope="col">
                <BilingualText text={UI.startTime} />
              </th>
              <th scope="col">
                <BilingualText text={UI.endDate} />
              </th>
              <th scope="col">
                <BilingualText text={UI.endTime} />
              </th>
              <th scope="col">
                <BilingualText text={UI.duration} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const className = [
                "tithi-degree-table__row",
                row.paksha === "shukla"
                  ? "tithi-degree-table__row--shukla"
                  : "tithi-degree-table__row--krishna",
                row.isPournami ? "tithi-degree-table__row--pournami" : "",
                row.isAmavasai ? "tithi-degree-table__row--amavasai" : "",
                row.isCurrent ? "tithi-degree-table__row--current" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <tr key={row.sno} className={className}>
                  <td className="tithi-degree-table__num">{row.sno}</td>
                  <td>
                    <BilingualText text={row.pakshaLabel} />
                  </td>
                  <td className="tithi-degree-table__name">
                    <BilingualText text={row.name} />
                  </td>
                  <td className="tithi-degree-table__center">{formatDegree(row.startDeg)}</td>
                  <td className="tithi-degree-table__center">{formatDegree(row.endDeg)}</td>
                  <td className="tithi-degree-table__center">{row.degreeRange}</td>
                  <td className="tithi-degree-table__center">
                    {formatTithiDate(row.start, timeZone)}
                  </td>
                  <td className="tithi-degree-table__center">
                    {formatTithiTime12(row.start, timeZone)}
                  </td>
                  <td className="tithi-degree-table__center">
                    {formatTithiDate(row.end, timeZone)}
                  </td>
                  <td className="tithi-degree-table__center">
                    {formatTithiTime12(row.end, timeZone)}
                  </td>
                  <td className="tithi-degree-table__center">
                    {formatDurationHHMM(row.durationMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
