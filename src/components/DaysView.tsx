import { Fragment } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import { useNavigation } from "../context/NavigationContext";
import {
  PATCHI_ENEMIES,
  PATCHI_NATPU,
  PATCHI_ORDER,
  PANCHA_ACTIVITIES,
  PAKSHA_BI,
  PATCHI_DAYS_TABLE,
  patchiEmoji,
  patchiLabelBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import { PATCHI_DETAILS_TABLE } from "../utils/patchiDetails";
import {
  NATCHATHIRA_PATCHI_COLUMNS,
} from "../utils/natchathiraPatchi";
import {
  THITHI_PATCHI_BY_PAKSHA,
  getThithiPlanetDay,
  type ThithiPakshaGroup,
} from "../utils/thithiPatchi";
import { getCurrentThithiPosition, isCurrentThithiRow } from "../utils/thithi";
import type { InformationSection } from "../utils/navigationState";
import type { PakshaId } from "../utils/paksha";

const INFORMATION_SECTIONS: { id: InformationSection; label: Bilingual }[] = [
  { id: "patchiDays", label: UI.patchiDays },
  { id: "thithiPatchi", label: UI.thithiPatchi },
  { id: "natchathiraPatchi", label: UI.natchathiraPatchi },
  { id: "patchiDetails", label: UI.patchiDetails },
  { id: "patchiActivity", label: UI.patchiActivity },
  { id: "patchiRelation", label: UI.patchiRelation },
];

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

function PatchiDaysSection() {
  return (
    <div className="days-view__two-col-tables">
      <section className="schedule-table-card days-view__patchi-days-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.valarpiraiPatchi} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col">
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
              {PATCHI_DAYS_TABLE.map((row) => (
                <tr key={`valar-${row.planet.en}`}>
                  <td className="days-table__day">
                    <BilingualText text={row.day} />
                  </td>
                  <td>
                    <PatchiCell bird={row.valarpiraiPatchi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="schedule-table-card days-view__patchi-days-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.theipiraiPatchi} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col">
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
              {PATCHI_DAYS_TABLE.map((row) => (
                <tr key={`thei-${row.planet.en}`}>
                  <td className="days-table__day">
                    <BilingualText text={row.day} />
                  </td>
                  <td>
                    <PatchiCell bird={row.theipiraiPatchi} />
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

function ThithiPakshaTable({
  title,
  pakshaId,
  groups,
  selectedDateTime,
}: {
  title: Bilingual;
  pakshaId: PakshaId;
  groups: ThithiPakshaGroup[];
  selectedDateTime: Date;
}) {
  const currentThithi = getCurrentThithiPosition(selectedDateTime);
  const highlightPaksha = currentThithi.pakshaId === pakshaId;

  return (
    <section className="schedule-table-card days-view__thithi-patchi-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={title} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table days-table--two-col thithi-patchi-table">
          <thead>
            <tr>
              <th>
                <BilingualText text={UI.thithi} />
              </th>
              <th>
                <BilingualText text={UI.athikaraPatchi} />
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => {
              const isGroupCurrent = highlightPaksha && currentThithi.groupIndex === groupIndex;

              return (
                <tr
                  key={`${pakshaId}-${group.thithis[0].en}`}
                  className={isGroupCurrent ? "thithi-patchi-table__row--current" : undefined}
                >
                  <td
                    className={
                      isGroupCurrent
                        ? "thithi-patchi-table__thithi thithi-patchi-table__cell--current"
                        : "thithi-patchi-table__thithi"
                    }
                  >
                    <span className="thithi-patchi-table__thithi-list">
                      {group.thithis.map((thithi, thithiIndex) => {
                        const isCurrent =
                          highlightPaksha &&
                          isCurrentThithiRow(selectedDateTime, groupIndex, thithiIndex);

                        return (
                          <Fragment key={thithi.en}>
                            {thithiIndex > 0 ? (
                              <span className="thithi-patchi-table__thithi-sep" aria-hidden="true">
                                {" · "}
                              </span>
                            ) : null}
                            <span
                              className={
                                isCurrent
                                  ? "thithi-patchi-table__thithi-item thithi-patchi-table__thithi-item--current"
                                  : "thithi-patchi-table__thithi-item"
                              }
                            >
                              <BilingualText text={thithi} />
                            </span>
                          </Fragment>
                        );
                      })}
                    </span>
                    <span className="thithi-patchi-table__meta">
                      <BilingualText text={group.planet} block={false} />
                      <span aria-hidden="true"> · </span>
                      <BilingualText text={getThithiPlanetDay(group.planet)} block={false} />
                    </span>
                  </td>
                  <td className={isGroupCurrent ? "thithi-patchi-table__cell--current" : undefined}>
                    <PatchiCell bird={group.patchi} />
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

function NatchathiraPatchiSection() {
  return (
    <section className="schedule-table-card days-view__natchathira-patchi-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={UI.natchathiraPatchi} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table days-table--two-col natchathira-patchi-table">
          <thead>
            <tr>
              <th>
                <BilingualText text={UI.patchi} />
              </th>
              <th>
                <BilingualText text={UI.natchathira} />
              </th>
            </tr>
          </thead>
          <tbody>
            {NATCHATHIRA_PATCHI_COLUMNS.map((column) => (
              <tr key={column.patchi}>
                <th scope="row" className="days-table__row-label">
                  <PatchiCell bird={column.patchi} />
                </th>
                <td className="natchathira-patchi-table__list">
                  {column.natchathiras.map((natchathira, index) => (
                    <Fragment key={natchathira.en}>
                      {index > 0 ? (
                        <span className="natchathira-patchi-table__sep" aria-hidden="true">
                          {", "}
                        </span>
                      ) : null}
                      <BilingualText text={natchathira} block={false} />
                    </Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ThithiPatchiSection({ selectedDateTime }: { selectedDateTime: Date }) {
  return (
    <div className="days-view__thithi-sections">
      <ThithiPakshaTable
        title={PAKSHA_BI.theipirai}
        pakshaId="theipirai"
        groups={THITHI_PATCHI_BY_PAKSHA.theipirai}
        selectedDateTime={selectedDateTime}
      />
      <ThithiPakshaTable
        title={PAKSHA_BI.valarpirai}
        pakshaId="valarpirai"
        groups={THITHI_PATCHI_BY_PAKSHA.valarpirai}
        selectedDateTime={selectedDateTime}
      />
    </div>
  );
}

function PatchiDetailsSection() {
  return (
    <div className="days-view__two-col-tables days-view__details-tables">
      <section className="schedule-table-card days-view__details-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.color} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col patchi-details-table">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.color} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_DETAILS_TABLE.map((row) => (
                <tr key={`color-${row.patchi}`}>
                  <td>
                    <PatchiCell bird={row.patchi} />
                  </td>
                  <td>
                    <BilingualText text={row.color} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="schedule-table-card days-view__details-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.number} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col patchi-details-table">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.number} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_DETAILS_TABLE.map((row) => (
                <tr key={`number-${row.patchi}`}>
                  <td>
                    <PatchiCell bird={row.patchi} />
                  </td>
                  <td>{row.number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="schedule-table-card days-view__details-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.direction} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col patchi-details-table">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.direction} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_DETAILS_TABLE.map((row) => (
                <tr key={`direction-${row.patchi}`}>
                  <td>
                    <PatchiCell bird={row.patchi} />
                  </td>
                  <td>
                    <BilingualText text={row.direction} />
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

function PatchiActivitySection() {
  return (
    <section className="schedule-table-card days-view__activity-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={UI.patchiActivity} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table days-table--two-col days-activity-table">
          <thead>
            <tr>
              <th>#</th>
              <th>
                <BilingualText text={UI.patchiActivity} />
              </th>
            </tr>
          </thead>
          <tbody>
            {PANCHA_ACTIVITIES.map((activity, index) => (
              <tr key={activity.ta}>
                <td className="days-activity-table__index">{index + 1}</td>
                <td>
                  <BilingualText text={activity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PatchiRelationSection() {
  return (
    <div className="days-view__two-col-tables days-view__relation-tables">
      <section className="schedule-table-card days-view__relation-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.natpu} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.natpu} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_ORDER.map((bird) => (
                <tr key={`friend-${bird}`}>
                  <td>
                    <PatchiCell bird={bird} />
                  </td>
                  <td>
                    <PatchiListCell birds={PATCHI_NATPU[bird]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="schedule-table-card days-view__relation-card">
        <h3 className="schedule-table-card__title">
          <BilingualText text={UI.enemies} />
        </h3>
        <div className="sheet-table-wrap">
          <table className="sheet-table days-table days-table--two-col">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
                <th>
                  <BilingualText text={UI.enemies} />
                </th>
              </tr>
            </thead>
            <tbody>
              {PATCHI_ORDER.map((bird) => (
                <tr key={`enemy-${bird}`}>
                  <td>
                    <PatchiCell bird={bird} />
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

export function DaysView({ selectedDateTime }: { selectedDateTime: Date }) {
  const { daysSection: activeSection, setDaysSection: setActiveSection } = useNavigation();

  return (
    <div className="days-view">
      <div
        className="sheet-picker days-view__submenu"
        role="tablist"
        aria-label={`${UI.patchiSubmenu.ta} ${UI.patchiSubmenu.en}`}
      >
        {INFORMATION_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            className={
              activeSection === section.id
                ? "sheet-picker__btn sheet-picker__btn--active"
                : "sheet-picker__btn"
            }
            onClick={() => setActiveSection(section.id)}
            aria-selected={activeSection === section.id}
          >
            <span className="sheet-picker__label">
              <BilingualText text={section.label} />
            </span>
          </button>
        ))}
      </div>

      {activeSection === "patchiDays" && <PatchiDaysSection />}
      {activeSection === "thithiPatchi" && (
        <ThithiPatchiSection selectedDateTime={selectedDateTime} />
      )}
      {activeSection === "natchathiraPatchi" && <NatchathiraPatchiSection />}
      {activeSection === "patchiDetails" && <PatchiDetailsSection />}
      {activeSection === "patchiActivity" && <PatchiActivitySection />}
      {activeSection === "patchiRelation" && <PatchiRelationSection />}
    </div>
  );
}
