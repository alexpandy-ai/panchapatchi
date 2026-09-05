import { useEffect, useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";

import { PatchiPickerBlock } from "./PatchiPickerBlock";

import { useLocation } from "../context/LocationContext";

import type { PakshaData } from "../types";

import { getAntharaSegmentIndex } from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import {

  PAKSHA_BI,

  PATCHI_ORDER,

  thozhilHeader,

  thozhilValueWithTime,

  UI,

} from "../utils/bilingual";

import {
  cycleStartFor,
  formatTimeRange,
  getJamamSlotByIndex,
  getJamamState,
  getNextJamamIndex,
  yamaFromJamamIndex,
  type PeriodId,
} from "../utils/jamam";

import { derivePatchiStatusFromSchedule } from "../utils/patchi";

import { getPakshaFromDate, type PakshaId } from "../utils/paksha";



interface PatchiStatusViewProps {

  selectedDateTime: Date;

  data: Record<PakshaId, PakshaData | null>;

  athikaraPatchi?: (typeof PATCHI_ORDER)[number];

  onAthikaraPatchiChange?: (patchi: (typeof PATCHI_ORDER)[number]) => void;

}

export function PatchiStatusView({

  selectedDateTime,

  data,

  athikaraPatchi: athikaraPatchiProp,

  onAthikaraPatchiChange,

}: PatchiStatusViewProps) {

  const { coords } = useLocation();

  const autoPaksha = getPakshaFromDate(selectedDateTime);

  const [pakshaId, setPakshaId] = useState<PakshaId>(autoPaksha);

  const [localAthikaraPatchi, setLocalAthikaraPatchi] =

    useState<(typeof PATCHI_ORDER)[number]>(PATCHI_ORDER[0]);

  const [myPatchi, setMyPatchi] =

    useState<(typeof PATCHI_ORDER)[number]>(PATCHI_ORDER[0]);

  const [antharaDialogTarget, setAntharaDialogTarget] = useState<"current" | "next" | null>(
    null,
  );



  const athikaraPatchi = athikaraPatchiProp ?? localAthikaraPatchi;

  const setAthikaraPatchi = onAthikaraPatchiChange ?? setLocalAthikaraPatchi;



  useEffect(() => {

    setPakshaId(autoPaksha);

  }, [autoPaksha]);



  const weekday = selectedDateTime.getDay();

  const paksha = data[pakshaId];

  const jamam = getJamamState(selectedDateTime, coords);

  const activeSlot = jamam.slots.find((s) => s.isActive) ?? jamam.slots[0];

  const cycleStart = cycleStartFor(selectedDateTime, coords);

  const nextJamamIndex = getNextJamamIndex(jamam.jamamIndex);

  const nextSlot = getJamamSlotByIndex(

    jamam.slots,

    jamam.jamamIndex,

    nextJamamIndex,

    cycleStart,

    coords,

  );



  const derived = useMemo(() => {

    if (!paksha) {

      return {

        athikaraGroupKey: null,

        myPatchi: null,

        myPatchiActivity: null,

        jamamSlots: [],

      };

    }

    return derivePatchiStatusFromSchedule(

      paksha,

      weekday,

      athikaraPatchi,

      jamam.yamaIndex,

      jamam.period,

      myPatchi,

    );

  }, [paksha, weekday, athikaraPatchi, myPatchi, jamam.yamaIndex, jamam.period]);



  const derivedNext = useMemo(() => {

    if (!paksha || !nextSlot) {

      return { myPatchiActivity: null };

    }

    const { yama, period } = yamaFromJamamIndex(nextSlot.index);

    return derivePatchiStatusFromSchedule(

      paksha,

      weekday,

      athikaraPatchi,

      yama,

      period,

      myPatchi,

    );

  }, [paksha, weekday, athikaraPatchi, myPatchi, nextSlot]);



  const antharaGroup = useMemo(
    () => paksha?.groups.find((group) => group.key === derived.athikaraGroupKey) ?? null,
    [paksha, derived.athikaraGroupKey],
  );

  const antharaDialogProps = useMemo(() => {
    if (!antharaGroup) return null;

    if (antharaDialogTarget === "current") {
      if (!activeSlot) return null;

      return {
        jamamSlot: activeSlot,
        getActivitySlots: (yama: number, period: PeriodId) => {
          const yamaRow = antharaGroup.yamas.find((row) => row.yama === yama);
          if (!yamaRow) return [];
          return period === "day" ? yamaRow.day : yamaRow.night;
        },
        highlightPatchi: myPatchi,
        highlightThozhil: derived.myPatchiActivity ?? "—",
        highlightSegmentIndex: getAntharaSegmentIndex(
          activeSlot.start,
          activeSlot.end,
          selectedDateTime,
        ),
      };
    }

    if (antharaDialogTarget === "next") {
      if (!nextSlot) return null;

      return {
        jamamSlot: nextSlot,
        getActivitySlots: (yama: number, period: PeriodId) => {
          const yamaRow = antharaGroup.yamas.find((row) => row.yama === yama);
          if (!yamaRow) return [];
          return period === "day" ? yamaRow.day : yamaRow.night;
        },
        highlightPatchi: myPatchi,
        highlightThozhil: derivedNext.myPatchiActivity ?? "—",
      };
    }

    return null;
  }, [
    antharaDialogTarget,
    antharaGroup,
    activeSlot,
    nextSlot,
    myPatchi,
    derived.myPatchiActivity,
    derivedNext.myPatchiActivity,
    selectedDateTime,
  ]);



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

        <div className="patchi-picker-sections athikara-row">
          <PatchiPickerBlock
            title={UI.athikaraPatchi}
            ariaLabel={`${UI.athikaraPatchi.ta} ${UI.athikaraPatchi.en}`}
            selected={athikaraPatchi}
            onSelect={setAthikaraPatchi}
          />
          <PatchiPickerBlock
            title={UI.myPatchi}
            ariaLabel={`${UI.myPatchi.ta} ${UI.myPatchi.en}`}
            selected={myPatchi}
            onSelect={setMyPatchi}
          />
        </div>

        <div className="context-row context-row--paksha">

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

        {activeSlot || nextSlot ? (
          <div className="context-row context-row--jamam-pair">
            <div className="jamam-pair">
              {activeSlot ? (
                <div className="jamam-pair__cell">
                  <span className="context-label">
                    <BilingualText text={thozhilHeader(activeSlot.index)} block={false} />
                  </span>
                  {derived.myPatchiActivity ? (
                    <button
                      type="button"
                      className="context-value-btn thozhil-value-btn jamam-summary__value"
                      aria-expanded={antharaDialogTarget === "current"}
                      onClick={() => setAntharaDialogTarget("current")}
                    >
                      <BilingualText
                        text={thozhilValueWithTime(
                          displayActivityBi(derived.myPatchiActivity),
                          formatTimeRange(activeSlot.start, activeSlot.end),
                        )}
                        block={false}
                      />
                    </button>
                  ) : (
                    <span className="context-value jamam-summary__value">
                      <span className="jamam-summary__time">
                        {formatTimeRange(activeSlot.start, activeSlot.end)}
                      </span>
                    </span>
                  )}
                </div>
              ) : null}
              {nextSlot ? (
                <div className="jamam-pair__cell">
                  <span className="context-label">
                    <BilingualText text={thozhilHeader(nextSlot.index)} block={false} />
                  </span>
                  {derivedNext.myPatchiActivity ? (
                    <button
                      type="button"
                      className="context-value-btn thozhil-value-btn jamam-summary__value"
                      aria-expanded={antharaDialogTarget === "next"}
                      onClick={() => setAntharaDialogTarget("next")}
                    >
                      <BilingualText
                        text={thozhilValueWithTime(
                          displayActivityBi(derivedNext.myPatchiActivity),
                          formatTimeRange(nextSlot.start, nextSlot.end),
                        )}
                        block={false}
                      />
                    </button>
                  ) : (
                    <span className="context-value jamam-summary__value">
                      <span className="jamam-summary__time">
                        {formatTimeRange(nextSlot.start, nextSlot.end)}
                      </span>
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

      </section>



      {!derived.myPatchiActivity && (

        <section className="activity-card activity-card--empty">

          <p>

            <BilingualText text={UI.noDayData} />

          </p>

        </section>

      )}



      {antharaDialogProps ? (

        <JamamAntharaDialog

          open={antharaDialogTarget !== null}

          jamamSlot={antharaDialogProps.jamamSlot}

          getActivitySlots={antharaDialogProps.getActivitySlots}

          highlightPatchi={antharaDialogProps.highlightPatchi}

          highlightThozhil={antharaDialogProps.highlightThozhil}

          highlightSegmentIndex={antharaDialogProps.highlightSegmentIndex}

          onClose={() => setAntharaDialogTarget(null)}

          coords={coords}

          jamamSlots={jamam.slots}

          cycleStart={cycleStart}

        />

      ) : null}

    </div>

  );

}

