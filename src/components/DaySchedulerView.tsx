import { DaySchedulerTable } from "./DaySchedulerTable";
import { useNavigation } from "../context/NavigationContext";
import type { Bilingual } from "../utils/bilingual";

interface DaySchedulerViewProps {
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

/**
 * Day Scheduler — independent of Patchi Schedule / TimeTableView / PATCHI_SCHEDULE_DATA.
 * Uses sunrise jamam columns + alternateCalculation bird/activity rules.
 */
export function DaySchedulerView({ selectedDateTime, subtitle }: DaySchedulerViewProps) {
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  return (
    <div className="time-table-view">
      <DaySchedulerTable
        selectedPatchi={selectedPatchi}
        onSelectPatchi={setSelectedPatchi}
        selectedDateTime={selectedDateTime}
        subtitle={subtitle}
      />
    </div>
  );
}
