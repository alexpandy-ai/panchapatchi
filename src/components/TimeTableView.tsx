import { useEffect, useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import { bi, pakshaLabelBilingual, patchiBilingual, UI, weekdayBilingual } from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import { extractPatchiNames, getPatchiSchedulesForDate } from "../utils/patchi";
import { PatchiScheduleTable } from "./PatchiScheduleTable";

interface TimeTableViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
}

export function TimeTableView({ selectedDateTime, data }: TimeTableViewProps) {
  const { coords } = useLocation();
  const patchiNames = useMemo(
    () => extractPatchiNames(data.valarpirai, data.theipirai),
    [data],
  );
  const [selectedPatchi, setSelectedPatchi] = useState("");

  useEffect(() => {
    if (patchiNames.length === 0) return;
    if (!selectedPatchi || !patchiNames.includes(selectedPatchi)) {
      setSelectedPatchi(patchiNames[0]);
    }
  }, [patchiNames, selectedPatchi]);

  const scheduleBundle = selectedPatchi
    ? getPatchiSchedulesForDate(selectedDateTime, data, selectedPatchi, coords)
    : null;

  const weekdayBi = useMemo(
    () => weekdayBilingual(selectedDateTime.getDay()),
    [selectedDateTime],
  );

  const titleBi = scheduleBundle
    ? bi(`${scheduleBundle.patchiName} — ${UI.timeTableTitle.ta}`, `${patchiBilingual(scheduleBundle.patchiName).en} — ${UI.timeTableTitle.en}`)
    : UI.timeTableTitle;

  const subtitleBi = scheduleBundle
    ? bi(
        `${weekdayBi.ta} · ${scheduleBundle.activePakshaLabel}`,
        `${weekdayBi.en} · ${pakshaLabelBilingual(scheduleBundle.activePakshaId).en}`,
      )
    : undefined;

  return (
    <div className="time-table-view">
      <nav className="patchi-submenu" aria-label={`${UI.patchiSubmenu.ta} ${UI.patchiSubmenu.en}`}>
        {patchiNames.map((name) => (
          <button
            key={name}
            type="button"
            className={selectedPatchi === name ? "patchi-submenu__btn patchi-submenu__btn--active" : "patchi-submenu__btn"}
            onClick={() => setSelectedPatchi(name)}
          >
            <BilingualText text={patchiBilingual(name)} />
          </button>
        ))}
      </nav>

      {scheduleBundle && (
        <PatchiScheduleTable bundle={scheduleBundle} title={titleBi} subtitle={subtitleBi} />
      )}

      {!scheduleBundle && (
        <p className="status">
          <BilingualText text={UI.noPatchiData} />
        </p>
      )}
    </div>
  );
}
