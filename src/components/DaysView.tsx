import { BilingualText } from "./BilingualText";
import { PANCHA_DAYS, UI } from "../utils/bilingual";

export function DaysView() {
  return (
    <div className="days-view">
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table">
          <thead>
            <tr>
              <th>
                <BilingualText text={UI.day} />
              </th>
            </tr>
          </thead>
          <tbody>
            {PANCHA_DAYS.map((day) => (
              <tr key={day.ta}>
                <td className="days-table__day">
                  <BilingualText text={day} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
