import { useEffect, useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import type { ActivitySlot, PakshaData } from "../types";
import { displayActivityBi } from "../utils/activityLabel";
import { getDayGroupKey, getDayGroupMembersBilingual } from "../utils/dayGroup";
import {
  bi,
  jamamBilingual,
  PAKSHA_BI,
  patchiBilingual,
  PERIOD_BI,
  UI,
  weekdayBilingual,
} from "../utils/bilingual";
import {
  formatCountdown,
  formatJamamDuration,
  formatTime,
  getDayCycleBounds,
  getJamamState,
} from "../utils/jamam";
import { locationLabelBilingual } from "../utils/location";
import { getPakshaFromDate, type PakshaId } from "../utils/paksha";

interface PatchiStatusViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
}

function jamamDurationBilingual(start: Date, end: Date) {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return bi(
    formatJamamDuration(start, end),
    h === 0 ? `${m} min` : m === 0 ? `${h} hr` : `${h} hr ${m} min`,
  );
}

export function PatchiStatusView({ selectedDateTime, data }: PatchiStatusViewProps) {
  const { coords, locationDisplay } = useLocation();
  const autoPaksha = getPakshaFromDate(selectedDateTime);
  const [pakshaId, setPakshaId] = useState<PakshaId>(autoPaksha);

  useEffect(() => {
    setPakshaId(autoPaksha);
  }, [autoPaksha]);

  const weekday = selectedDateTime.getDay();
  const paksha = data[pakshaId];
  const groupKey = getDayGroupKey(weekday);
  const group = paksha?.groups.find((g) => g.key === groupKey);
  const jamam = getJamamState(selectedDateTime, coords);
  const activeSlot = jamam.slots.find((s) => s.isActive) ?? jamam.slots[0];
  const yamaRow = group?.yamas.find((y) => y.yama === jamam.yamaIndex);
  const activities: ActivitySlot[] =
    jamam.period === "day" ? (yamaRow?.day ?? []) : (yamaRow?.night ?? []);

  const weekdayBi = useMemo(() => weekdayBilingual(weekday), [weekday]);
  const { sunrise, nextSunrise } = useMemo(
    () => getDayCycleBounds(selectedDateTime, coords),
    [selectedDateTime, coords],
  );
  const periodBi = jamam.period === "day" ? PERIOD_BI.day : PERIOD_BI.night;

  if (!paksha) {
    return (
      <p className="status">
        <BilingualText text={UI.loading} />
      </p>
    );
  }

  return (
    <div className="now-view">
      <section className="context-card">
        <div className="context-row">
          <span className="context-label">
            <BilingualText text={UI.day} />
          </span>
          <span className="context-value">
            <BilingualText text={weekdayBi} />
          </span>
        </div>
        <div className="context-row">
          <span className="context-label">
            <BilingualText text={UI.paksha} />
          </span>
          <div className="paksha-toggle">
            <button
              type="button"
              className={pakshaId === "valarpirai" ? "active" : ""}
              onClick={() => setPakshaId("valarpirai")}
            >
              <BilingualText text={PAKSHA_BI.valarpirai} />
            </button>
            <button
              type="button"
              className={pakshaId === "theipirai" ? "active" : ""}
              onClick={() => setPakshaId("theipirai")}
            >
              <BilingualText text={PAKSHA_BI.theipirai} />
            </button>
          </div>
        </div>
        <div className="context-row">
          <span className="context-label">
            <BilingualText text={UI.dayGroup} />
          </span>
          <span className="context-value">
            <BilingualText text={getDayGroupMembersBilingual(groupKey)} />
          </span>
        </div>
        <p className="context-hint">
          <BilingualText text={UI.sunrise} block={false} /> {formatTime(sunrise)} –{" "}
          <BilingualText text={UI.nextSunrise} block={false} /> {formatTime(nextSunrise)}
        </p>
        <p className="context-hint context-hint--location">
          <BilingualText text={locationLabelBilingual(locationDisplay)} />
        </p>
      </section>

      <section className="active-jamam-card">
        <div className="active-jamam-card__head">
          <span className="jamam-badge jamam-badge--active">
            <BilingualText text={jamamBilingual(activeSlot.index)} />
          </span>
          <span className="jamam-period">
            <BilingualText text={periodBi} />
          </span>
        </div>
        <p className="jamam-time-range">
          {formatTime(activeSlot.start)} – {formatTime(activeSlot.end)}
          <span className="jamam-duration">
            (<BilingualText text={jamamDurationBilingual(activeSlot.start, activeSlot.end)} />)
          </span>
        </p>
        {jamam.nextJamamEnd && (
          <p className="countdown">
            <BilingualText text={UI.nextJamam} block={false} />{" "}
            <strong>{formatCountdown(jamam.nextJamamEnd, selectedDateTime)}</strong>
          </p>
        )}
      </section>

      {activities.length > 0 ? (
        <section className="activity-card">
          <h2 className="activity-card__title">
            <BilingualText text={jamamBilingual(activeSlot.index)} /> —{" "}
            <BilingualText text={periodBi} />
          </h2>
          <table className="activity-table">
            <thead>
              <tr>
                <th>
                  <BilingualText text={UI.action} />
                </th>
                <th>
                  <BilingualText text={UI.patchi} />
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((slot, idx) => (
                <tr key={`${slot.activity}-${idx}`} className="activity-table__row--current">
                  <td className="schedule-grid-table__cell--current">
                    <BilingualText text={displayActivityBi(slot.activity)} />
                  </td>
                  <td className="schedule-grid-table__cell--current">
                    {slot.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}
                    <span className="schedule-table__badge schedule-table__badge--cell">
                      <BilingualText text={UI.now} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="activity-card activity-card--empty">
          <p>
            <BilingualText text={UI.noDayData} />
          </p>
        </section>
      )}
    </div>
  );
}
