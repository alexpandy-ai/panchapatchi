import { useEffect, useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";

import { useLocation } from "../context/LocationContext";

import type { PakshaData } from "../types";

import { getAntharaSegmentIndex, getAntharaSlots, getCurrentAntharaSlot, type AntharaSlot } from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import {

  bi,

  PAKSHA_BI,

  PATCHI_ORDER,

  patchiBilingual,

  thozhilHeader,

  thozhilValueWithTime,

  UI,

  type Bilingual,

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



/** Status page only — not used in other menus. */

const STATUS_UI = {

  antharaPatchi: bi("அந்தர பட்சி - தொழில்", "Anthara patchi - thozhil"),

} as const satisfies Record<string, Bilingual>;



function antharaSlotDisplay(slot: AntharaSlot): Bilingual {

  const bird = patchiBilingual(slot.bird);

  const activity = displayActivityBi(slot.activity);

  return bi(`${bird.ta} — ${activity.ta}`, `${bird.en} — ${activity.en}`);

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



  const antharaSlots = useMemo(

    () =>

      derived.jamamSlots.length > 0 && activeSlot

        ? getAntharaSlots(

            derived.jamamSlots,

            myPatchi,

            jamam.period,

            activeSlot.start,

            activeSlot.end,

          )

        : [],

    [derived.jamamSlots, myPatchi, jamam.period, activeSlot],

  );



  const currentAnthara = useMemo(

    () => getCurrentAntharaSlot(antharaSlots, selectedDateTime),

    [antharaSlots, selectedDateTime],

  );

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

        <div className="context-row athikara-row">

          <span className="context-label">

            <BilingualText text={UI.athikaraPatchi} block={false} />

          </span>

          <div

            className="athikara-row__chips"

            role="group"

            aria-label={`${UI.athikaraPatchi.ta} ${UI.athikaraPatchi.en}`}

          >

            {PATCHI_ORDER.map((name) => (

              <button

                key={name}

                type="button"

                className={

                  athikaraPatchi === name

                    ? "patchi-submenu__btn patchi-submenu__btn--active"

                    : "patchi-submenu__btn"

                }

                onClick={() => setAthikaraPatchi(name)}

              >

                <BilingualText text={patchiBilingual(name)} />

              </button>

            ))}

          </div>

        </div>

        <div className="context-row athikara-row">

          <span className="context-label">

            <BilingualText text={UI.myPatchi} block={false} />

          </span>

          <div

            className="athikara-row__chips"

            role="group"

            aria-label={`${UI.myPatchi.ta} ${UI.myPatchi.en}`}

          >

            {PATCHI_ORDER.map((name) => (

              <button

                key={name}

                type="button"

                className={

                  myPatchi === name

                    ? "patchi-submenu__btn patchi-submenu__btn--active"

                    : "patchi-submenu__btn"

                }

                onClick={() => setMyPatchi(name)}

              >

                <BilingualText text={patchiBilingual(name)} />

              </button>

            ))}

          </div>

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

        {activeSlot ? (
          <div className="context-row context-row--jamam-summary">
            <span className="context-label">
              <BilingualText text={thozhilHeader(activeSlot.index)} block={false} />
            </span>
            {derived.myPatchiActivity ? (
              <button
                type="button"
                className="context-value-btn jamam-summary__value"
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
          <div className="context-row context-row--jamam-summary context-row--jamam-next-start">
            <span className="context-label">
              <BilingualText text={thozhilHeader(nextSlot.index)} block={false} />
            </span>
            {derivedNext.myPatchiActivity ? (
              <button
                type="button"
                className="context-value-btn jamam-summary__value"
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

        {currentAnthara ? (

          <div className="context-row context-row--anthara">

            <span className="context-label">

              <BilingualText text={STATUS_UI.antharaPatchi} block={false} />

            </span>

            <span className="context-value">

              <BilingualText text={antharaSlotDisplay(currentAnthara)} block={false} />

            </span>

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

