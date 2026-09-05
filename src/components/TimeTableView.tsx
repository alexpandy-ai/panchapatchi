import { useState } from "react";
import { BilingualText } from "./BilingualText";
import { PatchiPickerBlock } from "./PatchiPickerBlock";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import { PATCHI_ORDER, UI } from "../utils/bilingual";
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

  return (
    <div className="time-table-view">
      <PatchiPickerBlock
        title={UI.selectOurPatchi}
        ariaLabel={`${UI.selectOurPatchi.ta} ${UI.selectOurPatchi.en}`}
        selected={selectedPatchi}
        onSelect={setSelectedPatchi}
      />

      {scheduleBundle ? (
        <PatchiScheduleTable bundle={scheduleBundle} />
      ) : (
        <p className="status">
          <BilingualText text={UI.noPatchiData} />
        </p>
      )}
    </div>
  );
}
