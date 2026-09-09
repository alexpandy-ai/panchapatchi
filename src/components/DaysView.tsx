import { Fragment } from "react";
import { BilingualText } from "./BilingualText";
import { InlineEmojiLabel } from "./InlineEmojiLabel";
import { useNavigation } from "../context/NavigationContext";
import {
  PATCHI_ENEMIES,
  PATCHI_NATPU,
  PATCHI_ORDER,
  PANCHA_ACTIVITIES,
  PANCHA_DAY_PATCHI,
  PANCHA_DAYS,
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
  NATCHATHIRA_PATCHI_ROW_COUNT,
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

function PatchiDaysSection() {
  return (
    <section className="schedule-table-card days-view__patchi-days-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={UI.patchiDays} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table days-table--transposed">
          <tbody>
            <tr>
              <th scope="row" className="days-table__row-label">
                <BilingualText text={UI.planets} />
              </th>
              {PATCHI_DAYS_TABLE.map((column) => (
                <td key={`${column.planet.en}-planet`}>
                  <BilingualText text={column.planet} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="days-table__row-label">
                <BilingualText text={UI.day} />
              </th>
              {PATCHI_DAYS_TABLE.map((column) => (
                <td key={`${column.planet.en}-day`}>
                  <BilingualText text={column.day} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="days-table__row-label">
                <BilingualText text={UI.valarpiraiPatchi} />
              </th>
              {PATCHI_DAYS_TABLE.map((column) => (
                <td key={`${column.planet.en}-valarpirai`}>
                  <PatchiCell bird={column.valarpiraiPatchi} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="days-table__row-label">
                <BilingualText text={UI.theipiraiPatchi} />
              </th>
              {PATCHI_DAYS_TABLE.map((column) => (
                <td key={`${column.planet.en}-theipirai`}>
                  <PatchiCell bird={column.theipiraiPatchi} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
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
  const groupHighlightClass = "thithi-patchi-table__cell--current";

  return (
    <section className="schedule-table-card days-view__thithi-patchi-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={title} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table thithi-patchi-table">
          <thead>
            <tr>
              <th colSpan={3}>
                <BilingualText text={UI.thithi} />
              </th>
              <th>
                <BilingualText text={UI.planet} />
              </th>
              <th>
                <BilingualText text={UI.day} />
              </th>
              <th>
                <BilingualText text={UI.athikaraPatchi} />
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => {
              const isGroupCurrent = highlightPaksha && currentThithi.groupIndex === groupIndex;
              const sharedCellClass = isGroupCurrent ? groupHighlightClass : undefined;

              return (
                <tr
                  key={`${pakshaId}-${group.thithis[0].en}`}
                  className={isGroupCurrent ? "thithi-patchi-table__row--current" : undefined}
                >
                  {group.thithis.map((thithi, thithiIndex) => {
                    const isCurrent =
                      highlightPaksha &&
                      isCurrentThithiRow(selectedDateTime, groupIndex, thithiIndex);

                    return (
                      <td
                        key={thithi.en}
                        className={
                          isCurrent
                            ? "thithi-patchi-table__thithi thithi-patchi-table__thithi-item--current"
                            : "thithi-patchi-table__thithi"
                        }
                      >
                        <BilingualText text={thithi} />
                      </td>
                    );
                  })}
                  <td className={sharedCellClass}>
                    <BilingualText text={group.planet} />
                  </td>
                  <td className={sharedCellClass}>
                    <BilingualText text={getThithiPlanetDay(group.planet)} />
                  </td>
                  <td className={sharedCellClass}>
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
        <table className="sheet-table days-table natchathira-patchi-table">
          <thead>
            <tr>
              {NATCHATHIRA_PATCHI_COLUMNS.map((column) => (
                <th key={column.patchi}>
                  <PatchiCell bird={column.patchi} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: NATCHATHIRA_PATCHI_ROW_COUNT }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {NATCHATHIRA_PATCHI_COLUMNS.map((column) => {
                  const natchathira = column.natchathiras[rowIndex];

                  return (
                    <td key={`${column.patchi}-${rowIndex}`}>
                      {natchathira ? <BilingualText text={natchathira} /> : null}
                    </td>
                  );
                })}
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
    <section className="schedule-table-card days-view__details-card">
      <h3 className="schedule-table-card__title">
        <BilingualText text={UI.patchiDetails} />
      </h3>
      <div className="sheet-table-wrap">
        <table className="sheet-table days-table patchi-details-table">
          <thead>
            <tr>
              <th>
                <BilingualText text={UI.patchi} />
              </th>
              <th>
                <BilingualText text={UI.color} />
              </th>
              <th>
                <BilingualText text={UI.number} />
              </th>
              <th>
                <BilingualText text={UI.direction} />
              </th>
            </tr>
          </thead>
          <tbody>
            {PATCHI_DETAILS_TABLE.map((row) => (
              <tr key={row.patchi}>
                <td>
                  <PatchiCell bird={row.patchi} />
                </td>
                <td>
                  <BilingualText text={row.color} />
                </td>
                <td>{row.number}</td>
                <td>
                  <BilingualText text={row.direction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PatchiActivitySection() {
  return (
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
  );
}

function PatchiRelationSection() {
  return (
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
