import { DaySchedulerTable } from "./DaySchedulerTable";
import { useNavigation } from "../context/NavigationContext";
import type { Bilingual } from "../utils/bilingual";
import "./ThithiScheduleView.css";

interface ThithiScheduleViewProps {
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

/**
 * Thithi Schedule — own route and page component around the shared schedule table.
 * Shared calculation engines stay in utils.
 */
export function ThithiScheduleView({ selectedDateTime, subtitle }: ThithiScheduleViewProps) {
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  return (
    <div className="time-table-view time-table-view--thithi-schedule">
      <DaySchedulerTable
        selectedPatchi={selectedPatchi}
        onSelectPatchi={setSelectedPatchi}
        selectedDateTime={selectedDateTime}
        subtitle={subtitle}
      />
    </div>
  );
}
