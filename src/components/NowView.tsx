import { useEffect, useMemo, useState } from "react";
import rawData from "../data/pancha-pakshi.json";
import type { ActivitySlot, PanchaPakshiData } from "../types";
import { useLocation } from "../context/LocationContext";
import { patchiBilingual } from "../utils/bilingual";
import { BilingualText } from "./BilingualText";
import { displayActivity } from "../utils/activityLabel";
import { getDayGroupKey, getDayGroupLabel, getPanchaDisplayWeekday, TAMIL_WEEKDAYS } from "../utils/dayGroup";
import {
  formatCountdown,
  formatJamamDuration,
  formatTime,
  formatTimeWithSeconds,
  getDayCycleBounds,
  getJamamState,
} from "../utils/jamam";
import { getSunset } from "../utils/sunrise";
import {
  getPakshaFromDate,
  PAKSHA_LABELS,
  type PakshaId,
} from "../utils/paksha";

const data = rawData as PanchaPakshiData;

type PakshaMode = "auto" | PakshaId;

export function NowView() {
  const { coords } = useLocation();
  const [now, setNow] = useState(() => new Date());
  const [pakshaMode, setPakshaMode] = useState<PakshaMode>("auto");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const weekday = now.getDay();
  const autoPaksha = getPakshaFromDate(now);
  const pakshaId: PakshaId = pakshaMode === "auto" ? autoPaksha : pakshaMode;
  const paksha = data[pakshaId];
  const groupKey = getDayGroupKey(weekday);
  const group = paksha.groups.find((g) => g.key === groupKey);
  const jamam = getJamamState(now, coords);
  const { sunrise } = useMemo(() => getDayCycleBounds(now, coords), [now, coords]);
  const sunset = useMemo(() => getSunset(now, coords), [now, coords]);
  const activeSlot = jamam.slots.find((s) => s.isActive) ?? jamam.slots[0];
  const yamaRow = group?.yamas.find((y) => y.yama === jamam.yamaIndex);
  const activities: ActivitySlot[] =
    jamam.period === "day" ? (yamaRow?.day ?? []) : (yamaRow?.night ?? []);

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("ta-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [now],
  );

  const timeLabel = useMemo(() => formatTimeWithSeconds(now), [now]);

  return (
    <div className="now-view">
      <section className="clock-card">
        <p className="clock-card__time">{timeLabel}</p>
        <p className="clock-card__date">{dateLabel}</p>
        <p className="clock-card__weekday">{TAMIL_WEEKDAYS[getPanchaDisplayWeekday(weekday)]}</p>
      </section>

      <section className="context-card">
        <div className="context-row">
          <span className="context-label">பக்ஷம்</span>
          <div className="paksha-toggle">
            <button
              type="button"
              className={pakshaMode === "auto" ? "active" : ""}
              onClick={() => setPakshaMode("auto")}
            >
              தானியங்கி ({PAKSHA_LABELS[autoPaksha]})
            </button>
            <button
              type="button"
              className={pakshaMode === "valarpirai" ? "active" : ""}
              onClick={() => setPakshaMode("valarpirai")}
            >
              வளர்பிறை
            </button>
            <button
              type="button"
              className={pakshaMode === "theipirai" ? "active" : ""}
              onClick={() => setPakshaMode("theipirai")}
            >
              தேய்பிறை
            </button>
          </div>
        </div>
        <div className="context-row">
          <span className="context-label">நாள் குழு</span>
          <span className="context-value">{getDayGroupLabel(groupKey)}</span>
        </div>
        <div className="context-row">
          <span className="context-label">பகுதி</span>
          <span className="context-value">
            {jamam.period === "day" ? paksha.daySectionLabel : paksha.nightSectionLabel}
          </span>
        </div>
        <p className="context-hint">
          சூரியோதயம் {formatTime(sunrise)} · சூரியாஸ்தமனம் {formatTime(sunset)}
        </p>
      </section>

      <section className="active-jamam-card">
        <div className="active-jamam-card__head">
          <span className="jamam-badge jamam-badge--active">{activeSlot.label}</span>
          <span className="jamam-period">{jamam.periodLabel}</span>
        </div>
        <p className="jamam-time-range">
          {formatTime(activeSlot.start)} – {formatTime(activeSlot.end)}
          <span className="jamam-duration">
            ({formatJamamDuration(activeSlot.start, activeSlot.end)})
          </span>
        </p>
        {jamam.nextJamamEnd && (
          <p className="countdown">
            அடுத்த ஜாமம் <strong>{formatCountdown(jamam.nextJamamEnd, now)}</strong>
          </p>
        )}
      </section>

      {activities.length > 0 ? (
        <section className="activity-card">
          <h2 className="activity-card__title">
            {activeSlot.label} — {jamam.periodLabel}
          </h2>
          <table className="activity-table">
            <thead>
              <tr>
                <th>செயல்</th>
                <th>பட்சி</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((slot, idx) => (
                <tr key={`${slot.activity}-${idx}`}>
                  <td>{displayActivity(slot.activity)}</td>
                  <td>{slot.bird ? <BilingualText text={patchiBilingual(slot.bird)} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="activity-card activity-card--empty">
          <p>இந்த நாளுக்கான தரவு கிடைக்கவில்லை.</p>
        </section>
      )}

      <section className="timeline-card">
        <h2 className="timeline-card__title">ஜாமங்கள் (1–10)</h2>
        <ul className="timeline">
          {jamam.slots.map((slot) => (
            <li
              key={slot.index}
              className={`timeline__item${slot.isActive ? " timeline__item--active" : ""}`}
            >
              <span className="timeline__label">{slot.label}</span>
              <span className="timeline__time">
                {formatTime(slot.start)} – {formatTime(slot.end)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
