import { DaySchedulerTable } from "./DaySchedulerTable";
import { useNavigation } from "../context/NavigationContext";
import type { Bilingual } from "../utils/bilingual";

interface ThithiScheduleViewProps {
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

/**
 * Thithi Schedule — own route and page component, initially the same layout
 * as Day Scheduler. Shared calculation engines stay in utils; this wrapper
 * can change without editing DaySchedulerView.
 */
export function ThithiScheduleView({ selectedDateTime, subtitle }: ThithiScheduleViewProps) {
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  return (
    <div className="time-table-view">
      <DaySchedulerTable
        selectedPatchi={selectedPatchi}
        onSelectPatchi={setSelectedPatchi}
        selectedDateTime={selectedDateTime}
        subtitle={subtitle}
        rowHeading="thithi"
      />
    </div>
  );
}
