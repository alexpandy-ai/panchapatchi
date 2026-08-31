import { useState } from "react";
import { BilingualText } from "./BilingualText";
import { SheetTable } from "./SheetTable";
import type { PakshaData } from "../types";
import { PAKSHA_BI, UI } from "../utils/bilingual";

type SheetTab = "valarpirai" | "theipirai";

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
  referenceDate: Date;
}

export function FindPatchiView({ data, referenceDate }: FindPatchiViewProps) {
  const [activeSheet, setActiveSheet] = useState<SheetTab>("valarpirai");
  const sheet = data[activeSheet];

  if (!sheet) {
    return (
      <p className="status">
        <BilingualText text={UI.loading} />
      </p>
    );
  }

  const groupCount = sheet.groups.length;
  const jamamCount = sheet.groups.reduce((total, group) => total + group.yamas.length * 2, 0);
  const activeTab = SHEET_TABS.find((tab) => tab.id === activeSheet)!;

  return (
    <div className="find-patchi">
      <div className="sheet-picker" role="tablist" aria-label={`${UI.sheetPicker.ta} ${UI.sheetPicker.en}`}>
        {SHEET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={activeSheet === tab.id ? "sheet-picker__btn sheet-picker__btn--active" : "sheet-picker__btn"}
            onClick={() => setActiveSheet(tab.id)}
            aria-selected={activeSheet === tab.id}
          >
            <span className="sheet-picker__label">
              <BilingualText text={tab.label} />
            </span>
          </button>
        ))}
      </div>

      <div className="sheet-meta">
        <span>
          <BilingualText text={activeTab.label} block={false} />{" "}
          <BilingualText text={UI.scheduleSheet} block={false} />
        </span>
        <span className="sheet-meta__dot" aria-hidden="true">
          ·
        </span>
        <span>
          {groupCount} <BilingualText text={UI.groups} block={false} />
        </span>
        <span className="sheet-meta__dot" aria-hidden="true">
          ·
        </span>
        <span>
          {jamamCount} <BilingualText text={UI.jamams} block={false} />
        </span>
      </div>

      <div className="sheet-table-panel">
        <SheetTable data={sheet} referenceDate={referenceDate} />
      </div>
    </div>
  );
}
