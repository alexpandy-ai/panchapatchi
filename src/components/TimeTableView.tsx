import { useEffect, useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import { bi, pakshaLabelBilingual, patchiBilingual, UI, weekdayBilingual } from "../utils/bilingual";
import { formatTime, formatTimeRange, getDayCycleBounds } from "../utils/jamam";
import type { PakshaId } from "../utils/paksha";
import { extractPatchiNames, getJamamSummary, getPatchiSchedulesForDate } from "../utils/patchi";
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

  const { activeSlot } = getJamamSummary(selectedDateTime, coords);
  const { sunrise, nextSunrise } = getDayCycleBounds(selectedDateTime, coords);
  const scheduleBundle = selectedPatchi
    ? getPatchiSchedulesForDate(selectedDateTime, data, selectedPatchi, coords)
    : null;

  const weekdayBi = useMemo(
    () => weekdayBilingual(selectedDateTime.getDay()),
    [selectedDateTime],
  );

  const dateBi = useMemo(() => {
    const taDate = selectedDateTime.toLocaleDateString("ta-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const enDate = selectedDateTime.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return bi(`${weekdayBi.ta}, ${taDate}`, `${weekdayBi.en}, ${enDate}`);
  }, [selectedDateTime, weekdayBi]);

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
      <div className="schedule-summary">
        <p className="schedule-summary__date">
          <BilingualText text={dateBi} />
        </p>
        <p className="schedule-summary__range">
          <BilingualText text={UI.sunrise} block={false} /> {formatTime(sunrise)} –{" "}
          <BilingualText text={UI.nextSunrise} block={false} /> {formatTime(nextSunrise)}
        </p>
        {activeSlot && scheduleBundle && (
          <p className="schedule-summary__active">
            <BilingualText text={UI.currentJamamLabel} block={false} />:{" "}
            <strong>
              <BilingualText text={bi(activeSlot.label, `Jamam ${activeSlot.index}`)} />
            </strong>{" "}
            <span className="schedule-summary__time">{formatTimeRange(activeSlot.start, activeSlot.end)}</span>
            <span className="schedule-summary__paksha">
              {" "}
              · <BilingualText text={pakshaLabelBilingual(scheduleBundle.activePakshaId)} />
            </span>
          </p>
        )}
      </div>

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
