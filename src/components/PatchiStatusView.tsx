import { useEffect, useMemo, useState } from "react";
import { BilingualText } from "./BilingualText";
import { JamamAntharaDialog } from "./JamamAntharaDialog";
import { useLocation } from "../context/LocationContext";
import type { ActivitySlot, PakshaData } from "../types";
import { getCurrentAntharaSlot, getAntharaSlots } from "../utils/anthara";
import { displayActivityBi } from "../utils/activityLabel";
import { getDayGroupKey } from "../utils/dayGroup";
import {
  bi,
  formatPatchiName,
  PAKSHA_BI,
  patchiBilingual,
  UI,
  type Bilingual,
} from "../utils/bilingual";
import { getJamamState } from "../utils/jamam";
import { getPakshaFromDate, type PakshaId } from "../utils/paksha";
import { extractPatchiNames } from "../utils/patchi";

interface PatchiStatusViewProps {
  selectedDateTime: Date;
  data: Record<PakshaId, PakshaData | null>;
}

/** Status page only — not used in other menus. */
const STATUS_UI = {
  jamamPatchiActivity: bi("ஜாமம் பட்சி செயல்", "Jamam patchi activity"),
  antharaPatchi: bi("அந்தர பட்சி", "Anthara patchi"),
} as const satisfies Record<string, Bilingual>;

function isSamePatchi(a: string, b: string): boolean {
  return formatPatchiName(a) === formatPatchiName(b);
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
  const [antharaDialogOpen, setAntharaDialogOpen] = useState(false);

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
  const selectedPatchiBi = selectedPatchi ? patchiBilingual(selectedPatchi) : null;

  const jamamSlots = useMemo((): ActivitySlot[] => {
    if (!paksha) return [];
    const group = paksha.groups.find((g) => g.key === groupKey);
    const yamaRow = group?.yamas.find((y) => y.yama === jamam.yamaIndex);
    if (!yamaRow) return [];
    return jamam.period === "day" ? yamaRow.day : yamaRow.night;
  }, [paksha, groupKey, jamam.yamaIndex, jamam.period]);

  const selectedPatchiSlot = jamamSlots.find((slot) =>
    isSamePatchi(slot.bird, selectedPatchi),
  );

  const antharaSlots = useMemo(
    () =>
      selectedPatchi && activeSlot
        ? getAntharaSlots(
            jamamSlots,
            selectedPatchi,
            jamam.period,
            activeSlot.start,
            activeSlot.end,
          )
        : [],
    [jamamSlots, selectedPatchi, jamam.period, activeSlot],
  );

  const currentAnthara = useMemo(
    () => getCurrentAntharaSlot(antharaSlots, selectedDateTime),
    [antharaSlots, selectedDateTime],
  );

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
        {selectedPatchiSlot ? (
          <div className="context-row context-row--action">
            <span className="context-label">
              <BilingualText text={STATUS_UI.jamamPatchiActivity} block={false} />
            </span>
            <button
              type="button"
              className="context-value-btn"
              aria-expanded={antharaDialogOpen}
              onClick={() => setAntharaDialogOpen(true)}
            >
              <BilingualText
                text={displayActivityBi(selectedPatchiSlot.activity)}
                block={false}
              />
            </button>
          </div>
        ) : null}
        {currentAnthara ? (
          <div className="context-row">
            <span className="context-label">
              <BilingualText text={STATUS_UI.antharaPatchi} block={false} />
            </span>
            <span className="context-value">
              <BilingualText
                text={displayActivityBi(currentAnthara.activity)}
                block={false}
              />
              {" — "}
              <BilingualText text={patchiBilingual(currentAnthara.bird)} block={false} />
            </span>
          </div>
        ) : null}
      </section>

      {!selectedPatchiSlot && (
        <section className="activity-card activity-card--empty">
          <p>
            <BilingualText text={UI.noDayData} />
          </p>
        </section>
      )}

      {selectedPatchiSlot && activeSlot ? (
        <JamamAntharaDialog
          open={antharaDialogOpen}
          start={activeSlot.start}
          end={activeSlot.end}
          activity={selectedPatchiSlot.activity}
          bird={selectedPatchi}
          onClose={() => setAntharaDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}
