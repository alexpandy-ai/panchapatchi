import { useEffect, useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { useLocation } from "../context/LocationContext";
import type { PakshaData } from "../types";
import { displayActivityBi } from "../utils/activityLabel";
import { getDayGroupKey } from "../utils/dayGroup";
import {
  bi,
  jamamBilingual,
  PAKSHA_BI,
  patchiBilingual,
  PERIOD_BI,
  UI,
} from "../utils/bilingual";
import {
  formatCountdown,
  formatJamamDuration,
  formatTime,
  getJamamState,
} from "../utils/jamam";
import { getPakshaFromDate, type PakshaId } from "../utils/paksha";
import { extractPatchiNames, getPatchiSlotAtJamam } from "../utils/patchi";

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
  const { coords } = useLocation();
  const autoPaksha = getPakshaFromDate(selectedDateTime);
  const [pakshaId, setPakshaId] = useState<PakshaId>(autoPaksha);
  const patchiNames = useMemo(
    () => extractPatchiNames(data.valarpirai, data.theipirai),
    [data],
  );
  const [selectedPatchi, setSelectedPatchi] = useState("");

  useEffect(() => {
    setPakshaId(autoPaksha);
  }, [autoPaksha]);

  useEffect(() => {
    if (patchiNames.length === 0) return;
    if (!selectedPatchi || !patchiNames.includes(selectedPatchi)) {
      setSelectedPatchi(patchiNames[0]);
    }
  }, [patchiNames, selectedPatchi]);

  const weekday = selectedDateTime.getDay();
  const paksha = data[pakshaId];
  const groupKey = getDayGroupKey(weekday);
  const jamam = getJamamState(selectedDateTime, coords);
  const activeSlot = jamam.slots.find((s) => s.isActive) ?? jamam.slots[0];
  const periodBi = jamam.period === "day" ? PERIOD_BI.day : PERIOD_BI.night;
  const selectedPatchiBi = selectedPatchi ? patchiBilingual(selectedPatchi) : null;

  const activePatchiSlot = useMemo(() => {
    if (!paksha || !selectedPatchi) return null;
    return getPatchiSlotAtJamam(paksha, groupKey, jamam.yamaIndex, jamam.period, selectedPatchi);
  }, [paksha, groupKey, jamam.yamaIndex, jamam.period, selectedPatchi]);

  if (!paksha) {
    return (
      <p className="status">
        <BilingualText text={UI.loading} />
      </p>
    );
  }

  return (
    <div className="now-view">
      <nav className="patchi-submenu" aria-label={`${UI.patchiSubmenu.ta} ${UI.patchiSubmenu.en}`}>
        {patchiNames.map((name) => (
          <button
            key={name}
            type="button"
            className={
              selectedPatchi === name
                ? "patchi-submenu__btn patchi-submenu__btn--active"
                : "patchi-submenu__btn"
            }
            onClick={() => setSelectedPatchi(name)}
          >
            <BilingualText text={patchiBilingual(name)} />
          </button>
        ))}
      </nav>

      <section className="context-card">
        <div className="context-row">
          <span className="context-label">
            <BilingualText text={UI.patchi} block={false} />
          </span>
          <span className="context-value">
            {selectedPatchiBi ? <BilingualText text={selectedPatchiBi} block={false} /> : "—"}
          </span>
        </div>
        <div className="context-row">
          <span className="context-label">
            <BilingualText text={UI.paksha} block={false} />
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

      {activePatchiSlot ? (
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
              <tr className="activity-table__row--current">
                <td className="schedule-grid-table__cell--current">
                  <BilingualText text={displayActivityBi(activePatchiSlot.activity)} />
                </td>
                <td className="schedule-grid-table__cell--current">
                  {activePatchiSlot.bird ? (
                    <BilingualText text={patchiBilingual(activePatchiSlot.bird)} />
                  ) : (
                    "—"
                  )}
                  <span className="schedule-table__badge schedule-table__badge--cell">
                    <BilingualText text={UI.now} />
                  </span>
                </td>
              </tr>
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
