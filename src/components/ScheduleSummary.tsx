import { useMemo } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import { bi, pakshaLabelBilingual, UI, weekdayBilingual } from "../utils/bilingual";
import { formatTime, formatTimeRange, getDayCycleBounds } from "../utils/jamam";
import { getPakshaFromDate } from "../utils/paksha";
import { getJamamSummary } from "../utils/patchi";

interface ScheduleSummaryProps {
  selectedDateTime: Date;
}

export function ScheduleSummary({ selectedDateTime }: ScheduleSummaryProps) {
  const { coords } = useLocation();
  const { activeSlot } = getJamamSummary(selectedDateTime, coords);
  const { sunrise, nextSunrise } = getDayCycleBounds(selectedDateTime, coords);
  const pakshaId = getPakshaFromDate(selectedDateTime);

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

  return (
    <div className="schedule-summary schedule-summary--global">
      <p className="schedule-summary__date">
        <BilingualText text={dateBi} />
      </p>
      <p className="schedule-summary__range">
        <BilingualText text={UI.sunrise} block={false} /> {formatTime(sunrise)} –{" "}
        <BilingualText text={UI.nextSunrise} block={false} /> {formatTime(nextSunrise)}
      </p>
      {activeSlot && (
        <p className="schedule-summary__active">
          <BilingualText text={UI.currentJamamLabel} block={false} />:{" "}
          <strong>
            <BilingualText text={bi(activeSlot.label, `Jamam ${activeSlot.index}`)} />
          </strong>{" "}
          <span className="schedule-summary__time">
            {formatTimeRange(activeSlot.start, activeSlot.end)}
          </span>
          <span className="schedule-summary__paksha">
            {" "}
            · <BilingualText text={pakshaLabelBilingual(pakshaId)} />
          </span>
        </p>
      )}
    </div>
  );
}
