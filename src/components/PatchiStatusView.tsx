import { useEffect, useMemo, useState } from "react";

import { BilingualText } from "./BilingualText";

import { JamamAntharaDialog } from "./JamamAntharaDialog";

import { useLocation } from "../context/LocationContext";

import type { PakshaData } from "../types";

import { getCurrentAntharaSlot, getJamamAntharaRows, type AntharaSlot } from "../utils/anthara";

import { displayActivityBi } from "../utils/activityLabel";

import {

  bi,

  PAKSHA_BI,

  PATCHI_ORDER,

  patchiBilingual,

  UI,

  type Bilingual,

} from "../utils/bilingual";

import {
  cycleStartFor,
  getJamamSlotByIndex,
  getJamamState,
  getJamamSummaryParts,
  getNextJamamIndex,
  yamaFromJamamIndex,
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

  const [antharaDialogOpen, setAntharaDialogOpen] = useState(false);



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



  const jamamActivitySlots = useMemo(() => {

    if (!paksha || !derived.athikaraGroupKey) return null;

    const group = paksha.groups.find((g) => g.key === derived.athikaraGroupKey);

    const yamaRow = group?.yamas.find((y) => y.yama === jamam.yamaIndex);

    if (!yamaRow) return null;

    return { day: yamaRow.day, night: yamaRow.night };

  }, [paksha, derived.athikaraGroupKey, jamam.yamaIndex]);



  const antharaSlots = useMemo(

    () =>

      derived.myPatchiActivity && activeSlot && jamamActivitySlots

        ? getJamamAntharaRows(

            activeSlot.start,

            activeSlot.end,

            derived.myPatchiActivity,

            jamamActivitySlots.day,

            jamamActivitySlots.night,

          )

        : [],

    [derived.myPatchiActivity, activeSlot, jamamActivitySlots],

  );



  const currentAnthara = useMemo(

    () => getCurrentAntharaSlot(antharaSlots, selectedDateTime),

    [antharaSlots, selectedDateTime],

  );

  const jamamSummary = useMemo(

    () => (activeSlot ? getJamamSummaryParts(activeSlot, pakshaId) : null),

    [activeSlot, pakshaId],

  );

  const nextJamamSummary = useMemo(

    () => (nextSlot ? getJamamSummaryParts(nextSlot, pakshaId) : null),

    [nextSlot, pakshaId],

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

        {jamamSummary ? (
          <>
            <div className="context-row context-row--jamam-summary">
              <span className="context-label">
                <BilingualText text={UI.currentJamam} block={false} />
              </span>
              <span className="context-value jamam-summary__value">
                <BilingualText text={jamamSummary.label} block={false} />
                {" · "}
                <span className="jamam-summary__time">{jamamSummary.timeRange}</span>
                {" · "}
                <BilingualText text={jamamSummary.paksha} block={false} />
              </span>
            </div>

            {derived.myPatchiActivity ? (
              <div className="context-row context-row--action">
                <span className="context-label">
                  <BilingualText text={UI.thozhil} block={false} />
                </span>
                <button
                  type="button"
                  className="context-value-btn"
                  aria-expanded={antharaDialogOpen}
                  onClick={() => setAntharaDialogOpen(true)}
                >
                  <BilingualText
                    text={displayActivityBi(derived.myPatchiActivity)}
                    block={false}
                  />
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {nextJamamSummary ? (
          <>
            <div className="context-row context-row--jamam-summary context-row--jamam-next-start">
              <span className="context-label">
                <BilingualText text={UI.nextJamam} block={false} />
              </span>
              <span className="context-value jamam-summary__value">
                <BilingualText text={nextJamamSummary.label} block={false} />
                {" · "}
                <span className="jamam-summary__time">{nextJamamSummary.timeRange}</span>
                {" · "}
                <BilingualText text={nextJamamSummary.paksha} block={false} />
              </span>
            </div>

            {derivedNext.myPatchiActivity ? (
              <div className="context-row context-row--action">
                <span className="context-label">
                  <BilingualText text={UI.thozhil} block={false} />
                </span>
                <span className="context-value">
                  <BilingualText
                    text={displayActivityBi(derivedNext.myPatchiActivity)}
                    block={false}
                  />
                </span>
              </div>
            ) : null}
          </>
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



      {derived.myPatchiActivity && activeSlot && jamamActivitySlots ? (

        <JamamAntharaDialog

          open={antharaDialogOpen}

          start={activeSlot.start}

          end={activeSlot.end}

          activity={derived.myPatchiActivity}

          dayJamamSlots={jamamActivitySlots.day}

          nightJamamSlots={jamamActivitySlots.night}

          onClose={() => setAntharaDialogOpen(false)}

        />

      ) : null}

    </div>

  );

}

