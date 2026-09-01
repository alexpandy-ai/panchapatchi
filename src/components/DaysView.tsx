import { BilingualText } from "./BilingualText";
import {
  PATCHI_ENEMIES,
  PATCHI_NATPU,
  PATCHI_ORDER,
  PANCHA_ACTIVITIES,
  PANCHA_DAY_PATCHI,
  PANCHA_DAYS,
  patchiBilingual,
  patchiListBilingual,
  UI,
} from "../utils/bilingual";

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
              <th>
                <BilingualText text={UI.patchi} />
              </th>
            </tr>
          </thead>
          <tbody>
            {PANCHA_DAYS.map((day, index) => (
              <tr key={day.ta}>
                <td className="days-table__day">
                  <BilingualText text={day} />
                </td>
                <td>
                  <BilingualText text={patchiBilingual(PANCHA_DAY_PATCHI[index])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="schedule-table-card days-view__activity-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.patchiActivity} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-activity-table">
            <thead>
              <tr>
                {PANCHA_ACTIVITIES.map((activity) => (
                  <th key={activity.ta}>
                    <BilingualText text={activity} />
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </section>

      <section className="schedule-table-card days-view__relationship-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.patchiRelations} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-relationship-table">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.natpu} />
                </th>
                <th>
                  <BilingualText text={UI.enemies} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_ORDER.map((bird) => (
                <tr key={bird}>
                  <td>
                    <BilingualText text={patchiBilingual(bird)} />
                  </td>
                  <td>
                    <BilingualText text={patchiListBilingual(PATCHI_NATPU[bird])} />
                  </td>
                  <td>
                    <BilingualText text={patchiListBilingual(PATCHI_ENEMIES[bird])} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
