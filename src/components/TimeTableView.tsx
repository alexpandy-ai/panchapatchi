import { useNavigation } from "../context/NavigationContext";
import type { Bilingual } from "../utils/bilingual";
import { PatchiScheduleTable } from "./PatchiScheduleTable";
import "./TimeTableView.css";

interface TimeTableViewProps {
  selectedDateTime: Date;
  subtitle?: Bilingual;
}

export function TimeTableView({ selectedDateTime, subtitle }: TimeTableViewProps) {
  const { patchi: selectedPatchi, setPatchi: setSelectedPatchi } = useNavigation();

  return (
    <div className="time-table-view time-table-view--patchi-schedule">
      <PatchiScheduleTable
        selectedPatchi={selectedPatchi}
        onSelectPatchi={setSelectedPatchi}
        selectedDateTime={selectedDateTime}
        subtitle={subtitle}
      />
    </div>
  );
}
