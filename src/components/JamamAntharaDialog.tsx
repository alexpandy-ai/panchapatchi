import { useEffect } from "react";

import type { ActivitySlot } from "../types";

import type { GeoCoords } from "../utils/location";

import type { JamamSlot, PeriodId } from "../utils/jamam";

import { JamamSegmentsPanel } from "./JamamSegmentsPanel";

export interface JamamAntharaDialogProps {
  open: boolean;
  jamamSlot: JamamSlot;
  getActivitySlots: (yama: number, period: PeriodId) => ActivitySlot[];
  highlightPatchi: string;
  highlightThozhil: string;
  highlightSegmentIndex?: number;
  onClose: () => void;
  coords?: GeoCoords | null;
  jamamSlots?: JamamSlot[];
  cycleStart?: Date;
}

export function JamamAntharaDialog({
  open,
  jamamSlot,
  getActivitySlots,
  highlightPatchi,
  highlightThozhil,
  highlightSegmentIndex,
  onClose,
  coords,
  jamamSlots,
  cycleStart,
}: JamamAntharaDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
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
          onClose={onClose}
          coords={coords}
          jamamSlots={jamamSlots}
          cycleStart={cycleStart}
        />
      </div>
    </div>
  );
}
