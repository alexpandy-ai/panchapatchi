import { BilingualText } from "./BilingualText";
import { antharaActivitiesFrom, antharaBirdsFrom } from "../utils/anthara";
import { displayActivityBi } from "../utils/activityLabel";
import { patchiBilingual, UI } from "../utils/bilingual";
import { formatTimeWithSeconds, splitJamamStartTimes } from "../utils/jamam";

export interface JamamSegmentsPanelProps {
  start: Date;
  end: Date;
  activity: string;
  bird: string;
  onClose: () => void;
}

export function JamamSegmentsPanel({ start, end, activity, bird, onClose }: JamamSegmentsPanelProps) {
  const segmentStarts = splitJamamStartTimes(start, end);
  const segmentCount = segmentStarts.length;
  const activities =
    activity !== "—" ? antharaActivitiesFrom(activity, segmentCount) : Array(segmentCount).fill("—");
  const birds = antharaBirdsFrom(bird, segmentCount);

  return (
    <div className="jamam-segments-panel">
      <div className="jamam-segments-panel__head">
        <button
          type="button"
          className="jamam-segments-panel__close"
          aria-label={`${UI.close.ta} ${UI.close.en}`}
          onClick={onClose}
        >
          <BilingualText text={UI.close} />
        </button>
      </div>
      <table className="jamam-segments-table jamam-segments-table--anthara">
        <thead>
          <tr>
            <th scope="col">
              <BilingualText text={UI.segmentStartTime} />
            </th>
            <th scope="col">
              <BilingualText text={UI.action} />
            </th>
            <th scope="col">
              <BilingualText text={UI.patchi} />
            </th>
          </tr>
        </thead>
        <tbody>
          {segmentStarts.map((segmentStart, index) => (
            <tr key={index}>
              <td>{formatTimeWithSeconds(segmentStart)}</td>
              <td>
                {activities[index] === "—" ? (
                  "—"
                ) : (
                  <BilingualText text={displayActivityBi(activities[index])} block={false} />
                )}
              </td>
              <td>
                <BilingualText text={patchiBilingual(birds[index])} block={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
