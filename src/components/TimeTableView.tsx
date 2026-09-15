import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { useNavigation } from "../context/NavigationContext";
import { useLocation } from "../context/LocationContext";
import { PATCHI_SCHEDULE_DATA } from "../data/patchiScheduleData";
import type { PakshaData } from "../types";
import { PATCHI_ORDER, UI, type Bilingual } from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import { getPatchiSchedulesForDate, type PatchiSchedulesBundle } from "../utils/patchi";
import { PatchiScheduleTable } from "./PatchiScheduleTable";

type PatchiName = (typeof PATCHI_ORDER)[number];

interface TimeTableViewProps {
  selectedDateTime: Date;
  /** Patchi Schedule paksha tables (Schedule / Find Patchi). */
  data?: Record<PakshaId, PakshaData | null>;
  subtitle?: Bilingual;
}

export function TimeTableView({
  selectedDateTime,
  data = PATCHI_SCHEDULE_DATA,
  subtitle,
}: TimeTableViewProps) {
  const { coords } = useLocation();
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  const allBundles = useMemo(
    () =>
      PATCHI_ORDER.map((patchiName) => ({
        patchiName,
        bundle: getPatchiSchedulesForDate(selectedDateTime, data, patchiName, coords),
      })).filter(
        (entry): entry is { patchiName: PatchiName; bundle: PatchiSchedulesBundle } =>
          entry.bundle !== null,
      ),
    [selectedDateTime, data, coords],
  );

  const scheduleBundle = useMemo(() => {
    if (selectedPatchi === "all") {
      return allBundles[0]?.bundle ?? null;
    }

    return getPatchiSchedulesForDate(selectedDateTime, data, selectedPatchi, coords);
  }, [selectedPatchi, selectedDateTime, data, coords, allBundles]);

  const hasScheduleData = selectedPatchi === "all" ? allBundles.length > 0 : scheduleBundle !== null;

  return (
    <div className="time-table-view">
      {hasScheduleData ? (
        <PatchiScheduleTable
          bundle={scheduleBundle}
          allBundles={selectedPatchi === "all" ? allBundles : undefined}
          selectedPatchi={selectedPatchi}
          onSelectPatchi={setSelectedPatchi}
          subtitle={subtitle}
        />
      ) : (
        <p className="status">
          <BilingualText text={UI.noPatchiData} />
        </p>
      )}
    </div>
  );
}
