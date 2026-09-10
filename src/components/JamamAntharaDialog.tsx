import { useEffect, useState } from "react";

import type { ActivitySlot } from "../types";

import type { GeoCoords } from "../utils/location";

import type { JamamSlot, PeriodId } from "../utils/jamam";

import type { PatchiAntharaMatrixOptions } from "../utils/anthara";

import { JamamSegmentsPanel, type NaalActivitySelection } from "./JamamSegmentsPanel";
import { NaalDialog } from "./NaalDialog";

export interface JamamAntharaDialogProps {
  open: boolean;
  jamamSlot: JamamSlot;
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[];
  highlightPatchi: string;
  highlightThozhil: string;
  highlightSegmentIndex?: number;
  /** When set, show only this bird's activity column (Home anthara dialog). */
  onlyPatchi?: string;
  onClose: () => void;
  coords?: GeoCoords | null;
  jamamSlots?: JamamSlot[];
  cycleStart?: Date;
  segmentCount?: number;
  matrixOptions?: PatchiAntharaMatrixOptions;
}

export function JamamAntharaDialog({
  open,
  jamamSlot,
  getActivitySlots,
  highlightPatchi,
  highlightThozhil,
  highlightSegmentIndex,
  onlyPatchi,
  onClose,
  coords,
  jamamSlots,
  cycleStart,
  segmentCount,
  matrixOptions,
}: JamamAntharaDialogProps) {
  const [naalSelection, setNaalSelection] = useState<NaalActivitySelection | null>(null);

  useEffect(() => {
    if (!open) setNaalSelection(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (naalSelection) {
        setNaalSelection(null);
        return;
      }
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, naalSelection]);

  if (!open) return null;

  return (
    <>
      <div
        className="anthara-dialog-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="anthara-dialog"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <JamamSegmentsPanel
            jamamSlot={jamamSlot}
            getActivitySlots={getActivitySlots}
            highlightPatchi={highlightPatchi}
            highlightThozhil={highlightThozhil}
            highlightSegmentIndex={highlightSegmentIndex}
            onlyPatchi={onlyPatchi}
            onClose={onClose}
            onActivityClick={setNaalSelection}
            coords={coords}
            jamamSlots={jamamSlots}
            cycleStart={cycleStart}
            segmentCount={segmentCount}
            matrixOptions={matrixOptions}
          />
        </div>
      </div>

      {naalSelection ? (
        <NaalDialog
          open
          segmentStart={naalSelection.segmentStart}
          segmentEnd={naalSelection.segmentEnd}
          antharaSerial={naalSelection.antharaSerial}
          patchi={naalSelection.patchi}
          activity={naalSelection.activity}
          birdRows={naalSelection.birdRows}
          period={naalSelection.period}
          repeatActivity={naalSelection.repeatActivity}
          appendNextDayMorning={naalSelection.appendNextDayMorning}
          nextDayMorningByBird={naalSelection.nextDayMorningByBird}
          onClose={() => setNaalSelection(null)}
        />
      ) : null}
    </>
  );
}
