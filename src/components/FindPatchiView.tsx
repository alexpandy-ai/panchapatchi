import { TimeTableView } from "./TimeTableView";

interface FindPatchiViewProps {
  selectedDateTime: Date;
}

/**
 * Know Patchi — shares Patchi Schedule TypeScript tables (no separate dataset).
 * Does not use Day Scheduler (alternateCalculation) rules.
 */
export function FindPatchiView({ selectedDateTime }: FindPatchiViewProps) {
  return <TimeTableView selectedDateTime={selectedDateTime} />;
}
