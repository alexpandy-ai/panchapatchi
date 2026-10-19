import { useNavigation } from "../context/NavigationContext";
import type { Bilingual } from "../utils/bilingual";
import { PatchiScheduleTable } from "./PatchiScheduleTable";

interface TimeTableViewProps {
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

export function TimeTableView({ selectedDateTime, subtitle }: TimeTableViewProps) {
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  return (
    <div className="time-table-view">
      <PatchiScheduleTable
        selectedPatchi={selectedPatchi}
        onSelectPatchi={setSelectedPatchi}
        selectedDateTime={selectedDateTime}
        subtitle={subtitle}
      />
    </div>
  );
}
