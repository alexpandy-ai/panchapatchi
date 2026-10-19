import { BilingualText } from "./BilingualText";
import { BirdEatingScheduleTable } from "./DaySchedulerTable";
import { PatchiFilterChips, type PatchiSelection } from "./PatchiPickerBlock";
import { useNavigation } from "../context/NavigationContext";

import { PATCHI_ORDER, patchiBilingual, PAKSHA_BI, UI, type Bilingual } from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";

const SHEET_TABS: { id: PakshaId; label: (typeof PAKSHA_BI)[PakshaId] }[] = [
  { id: "valarpirai", label: PAKSHA_BI.valarpirai },
  { id: "theipirai", label: PAKSHA_BI.theipirai },
];

interface PatchiScheduleTableProps {
  selectedPatchi: PatchiSelection;
  onSelectPatchi: (patchi: PatchiSelection) => void;
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

export function PatchiScheduleTable({
  selectedPatchi,
  onSelectPatchi,
  selectedDateTime,
  subtitle,
}: PatchiScheduleTableProps) {
  const { paksha: activePaksha, setPaksha: setActivePaksha } = useNavigation();
  const birds = selectedPatchi === "all" ? PATCHI_ORDER : [selectedPatchi];

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

      {birds.map((patchiName) => (
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
            <BirdEatingScheduleTable
              pakshaId={activePaksha}
              bird={patchiName}
              selectedDateTime={selectedDateTime}
              hideThithiRows={selectedPatchi === "all"}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
