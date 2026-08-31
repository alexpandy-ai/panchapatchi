import { useEffect } from "react";
import { JamamSegmentsPanel } from "./JamamSegmentsPanel";

export interface JamamAntharaDialogProps {
  open: boolean;
  start: Date;
  end: Date;
  activity: string;
  bird: string;
  onClose: () => void;
}

export function JamamAntharaDialog({
  open,
  start,
  end,
  activity,
  bird,
  onClose,
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
          start={start}
          end={end}
          activity={activity}
          bird={bird}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
