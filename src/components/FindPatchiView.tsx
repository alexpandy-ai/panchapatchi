import { useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { SheetTable } from "./SheetTable";

import { useLocation } from "../context/LocationContext";

import type { PakshaData } from "../types";

import { displayActivityBi } from "../utils/activityLabel";

import {
  bi,
  formatPatchiName,
  PAKSHA_BI,
  PATCHI_ORDER,
  patchiBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";

import { getDayGroupKey } from "../utils/dayGroup";

import { getJamamState } from "../utils/jamam";

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

const FIND_UI = {
  jamamPatchiActivity: bi("ஜாமம் பட்சி செயல்", "Jamam patchi activity"),
} as const satisfies Record<string, Bilingual>;

function isSamePatchi(a: string, b: string): boolean {
  return formatPatchiName(a) === formatPatchiName(b);
}

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
  const { coords } = useLocation();
  const pakshaFromDate = getPakshaFromDate(selectedDateTime);
  const [activeSheet, setActiveSheet] = useState<SheetTab>(pakshaFromDate);
  const [selectedPatchi, setSelectedPatchi] = useState<PatchiName>(PATCHI_ORDER[0]);
  const [tableHighlightPatchiLocal, setTableHighlightPatchi] = useState<PatchiName | null>(null);
  const sheet = data[activeSheet];
  const tableHighlightPatchi = highlightPatchiProp ?? tableHighlightPatchiLocal;

  const paksha = data[pakshaFromDate];
  const weekday = selectedDateTime.getDay();
  const groupKey = getDayGroupKey(weekday);
  const jamam = getJamamState(selectedDateTime, coords);

  const jamamSlots = useMemo(() => {
    if (!paksha) return [];
    const group = paksha.groups.find((g) => g.key === groupKey);
    const yamaRow = group?.yamas.find((y) => y.yama === jamam.yamaIndex);
    if (!yamaRow) return [];
    return jamam.period === "day" ? yamaRow.day : yamaRow.night;
  }, [paksha, groupKey, jamam.yamaIndex, jamam.period]);

  const selectedPatchiSlot = useMemo(
    () => jamamSlots.find((slot) => isSamePatchi(slot.bird, selectedPatchi)),
    [jamamSlots, selectedPatchi],
  );

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
      <section className="athikara-panel">
        <div className="context-row athikara-row">
          <span className="context-label">
            <BilingualText text={UI.athikaraPatchi} block={false} />
          </span>
          <div
            className="athikara-row__chips"
            role="group"
            aria-label={`${UI.athikaraPatchi.ta} ${UI.athikaraPatchi.en}`}
          >
            {PATCHI_ORDER.map((name) => (
              <button
                key={name}
                type="button"
                className={
                  selectedPatchi === name
                    ? "patchi-submenu__btn patchi-submenu__btn--active"
                    : "patchi-submenu__btn"
                }
                onClick={() => {
                  setSelectedPatchi(name);
                  setTableHighlightPatchi(name);
                }}
              >
                <BilingualText text={patchiBilingual(name)} />
              </button>
            ))}
          </div>
        </div>

        {selectedPatchiSlot ? (
          <div className="context-row">
            <span className="context-label">
              <BilingualText text={FIND_UI.jamamPatchiActivity} block={false} />
            </span>
            <span className="context-value">
              <BilingualText text={displayActivityBi(selectedPatchiSlot.activity)} block={false} />
            </span>
          </div>
        ) : (
          <p className="athikara-panel__empty">
            <BilingualText text={UI.noDayData} />
          </p>
        )}
      </section>

      <div
        className="sheet-picker"
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
            onClick={() => {
              setActiveSheet(tab.id);
              setTableHighlightPatchi(selectedPatchi);
            }}
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
        <span className="sheet-meta__dot" aria-hidden="true">·</span>
        <span>
          {groupCount} <BilingualText text={UI.groups} block={false} />
        </span>
        <span className="sheet-meta__dot" aria-hidden="true">·</span>
        <span>
          {jamamCount} <BilingualText text={UI.jamams} block={false} />
        </span>
      </div>

      <div className="sheet-table-panel">
        <SheetTable
          data={sheet}
          pakshaId={activeSheet}
          referenceDate={selectedDateTime}
          highlightPatchi={tableHighlightPatchi}
        />
      </div>
    </div>
  );
}
