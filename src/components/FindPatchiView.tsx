import { useState } from "react";

import { BilingualText } from "./BilingualText";

import { PatchiPickerBlock } from "./PatchiPickerBlock";

import { SheetTable } from "./SheetTable";

import type { PakshaData } from "../types";

import {
  PAKSHA_BI,
  PATCHI_ORDER,
  UI,
} from "../utils/bilingual";

import { getPakshaFromDate } from "../utils/paksha";

type SheetTab = "valarpirai" | "theipirai";

type PatchiName = (typeof PATCHI_ORDER)[number];

const SHEET_TABS: { id: SheetTab; label: (typeof PAKSHA_BI)[SheetTab] }[] = [
  {
    id: "valarpirai",
    label: PAKSHA_BI.valarpirai,
  },
  {
    id: "theipirai",
    label: PAKSHA_BI.theipirai,
  },
];

interface FindPatchiViewProps {
  data: Record<SheetTab, PakshaData | null>;
  selectedDateTime: Date;
  highlightPatchi?: PatchiName | null;
}

export function FindPatchiView({
  data,
  selectedDateTime,
  highlightPatchi: highlightPatchiProp = null,
}: FindPatchiViewProps) {
  const pakshaFromDate = getPakshaFromDate(selectedDateTime);
  const [activeSheet, setActiveSheet] = useState<SheetTab>(pakshaFromDate);
  const [selectedPatchi, setSelectedPatchi] = useState<PatchiName>(
    highlightPatchiProp ?? PATCHI_ORDER[0],
  );
  const sheet = data[activeSheet];

  if (!sheet) {
    return (
      <p className="status">
        <BilingualText text={UI.loading} />
      </p>
    );
  }

  return (
    <div className="find-patchi">
      <PatchiPickerBlock
        title={UI.athikaraPatchi}
        ariaLabel={`${UI.athikaraPatchi.ta} ${UI.athikaraPatchi.en}`}
        selected={selectedPatchi}
        onSelect={setSelectedPatchi}
      />

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
              activeSheet === tab.id
                ? "sheet-picker__btn sheet-picker__btn--active"
                : "sheet-picker__btn"
            }
            onClick={() => setActiveSheet(tab.id)}
            aria-selected={activeSheet === tab.id}
          >
            <span className="sheet-picker__label">
              <BilingualText text={tab.label} />
            </span>
          </button>
        ))}
      </div>

      <div className="sheet-table-panel">
        <SheetTable
          data={sheet}
          pakshaId={activeSheet}
          referenceDate={selectedDateTime}
          highlightPatchi={selectedPatchi}
        />
      </div>
    </div>
  );
}
