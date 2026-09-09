import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { useNavigation } from "../context/NavigationContext";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import { PATCHI_ORDER, UI, type Bilingual } from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import { getPatchiSchedulesForDate, type PatchiSchedulesBundle } from "../utils/patchi";
import { PatchiScheduleTable } from "./PatchiScheduleTable";

type PatchiName = (typeof PATCHI_ORDER)[number];

interface TimeTableViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
  subtitle?: Bilingual;
  alternateCalculation?: boolean;
}

export function TimeTableView({
  selectedDateTime,
  data,
  subtitle,
  alternateCalculation = false,
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
          alternateCalculation={alternateCalculation}
        />
      ) : (
        <p className="status">
          <BilingualText text={UI.noPatchiData} />
        </p>
      )}
    </div>
  );
}
