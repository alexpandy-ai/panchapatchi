import { useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import {
  bi,
  pakshaLabelBilingual,
  PATCHI_ORDER,
  patchiBilingual,
  UI,
  weekdayBilingual,
} from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import { getPatchiSchedulesForDate } from "../utils/patchi";
import { PatchiScheduleTable } from "./PatchiScheduleTable";

type PatchiName = (typeof PATCHI_ORDER)[number];

interface TimeTableViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
}

export function TimeTableView({ selectedDateTime, data }: TimeTableViewProps) {
  const { coords } = useLocation();
  const [selectedPatchi, setSelectedPatchi] = useState<PatchiName>(PATCHI_ORDER[0]);

  const scheduleBundle = getPatchiSchedulesForDate(
    selectedDateTime,
    data,
    selectedPatchi,
    coords,
  );

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
      <section className="athikara-panel">
        <div className="context-row athikara-row">
          <span className="context-label">
            <BilingualText text={UI.selectOurPatchi} block={false} />
          </span>
          <div
            className="athikara-row__chips"
            role="group"
            aria-label={`${UI.selectOurPatchi.ta} ${UI.selectOurPatchi.en}`}
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
                onClick={() => setSelectedPatchi(name)}
              >
                <BilingualText text={patchiBilingual(name)} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {scheduleBundle ? (
        <PatchiScheduleTable
          bundle={scheduleBundle}
          title={titleBi}
          subtitle={subtitleBi}
          coords={coords}
        />
      ) : (
        <p className="status">
          <BilingualText text={UI.noPatchiData} />
        </p>
      )}
    </div>
  );
}
