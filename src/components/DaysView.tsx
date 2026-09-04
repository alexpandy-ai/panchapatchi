import { Fragment } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import type { Bilingual } from "../utils/bilingual";
import {
  PATCHI_ENEMIES,
  PATCHI_NATPU,
  PATCHI_ORDER,
  PANCHA_ACTIVITIES,
  PANCHA_DAY_PATCHI,
  PANCHA_DAYS,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
} from "../utils/bilingual";

function dayForBird(bird: (typeof PATCHI_ORDER)[number]): Bilingual {
  const index = PANCHA_DAY_PATCHI.indexOf(bird);
  return PANCHA_DAYS[index];
}

function PatchiCell({ bird }: { bird: string }) {
  return <InlineEmojiLabel text={patchiLabelBilingual(bird)} emoji={patchiEmoji(bird)} />;
}

function PatchiListCell({ birds }: { birds: readonly string[] }) {
  return (
    <>
      {birds.map((bird, index) => (
        <Fragment key={bird}>
          {index > 0 ? ", " : null}
          <PatchiCell bird={bird} />
        </Fragment>
      ))}
    </>
  );
}

export function DaysView() {
  return (
    <div className="days-view">
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

      <section className="schedule-table-card days-view__relation-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.patchiRelation} />
        </h3>
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
                  <td className="days-table__day">
                    <BilingualText text={dayForBird(bird)} />
                  </td>
                  <td>
                    <PatchiCell bird={bird} />
                  </td>
                  <td>
                    <PatchiListCell birds={PATCHI_NATPU[bird]} />
                  </td>
                  <td>
                    <PatchiListCell birds={PATCHI_ENEMIES[bird]} />
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
