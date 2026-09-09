import { useEffect, useState } from "react";

import { BilingualText } from "./BilingualText";

import { PATCHI_ORDER, patchiBilingual, UI, type Bilingual } from "../utils/bilingual";

const HOME_MOBILE_SPLIT_BREAKPOINT_PX = 640;
const HOME_MOBILE_ONE_CHIP_BREAKPOINT_PX = 400;

function useHomeLeadingChipCount(mobileSplit: boolean): number {
  const [leadingCount, setLeadingCount] = useState(2);

  useEffect(() => {
    if (!mobileSplit) return;

    const update = () => {
      const width = window.innerWidth;
      if (width > HOME_MOBILE_SPLIT_BREAKPOINT_PX) {
        setLeadingCount(PATCHI_ORDER.length);
        return;
      }
      setLeadingCount(width <= HOME_MOBILE_ONE_CHIP_BREAKPOINT_PX ? 1 : 2);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mobileSplit]);

  return leadingCount;
}



type PatchiName = (typeof PATCHI_ORDER)[number];

export type PatchiSelection = PatchiName | "all";

interface PatchiPickerBlockProps {

  title: Bilingual;

  ariaLabel: string;

  selected: PatchiName;

  onSelect: (patchi: PatchiName) => void;

}

interface PatchiFilterChipsProps {
  selected: PatchiSelection;
  onSelect: (patchi: PatchiSelection) => void;
  includeAll?: boolean;
  ariaLabel: string;
  /** Home mobile: first chips beside athikara, rest on the next row. */
  mobileSplit?: boolean;
}

function PatchiFilterChipButton({
  name,
  selected,
  onSelect,
}: {
  name: PatchiName;
  selected: PatchiSelection;
  onSelect: (patchi: PatchiSelection) => void;
}) {
  return (
    <button
      type="button"
      className={`patchi-submenu__btn${
        name === selected ? " patchi-submenu__btn--active" : ""
      }`}
      aria-pressed={name === selected}
      onClick={() => onSelect(name)}
    >
      <BilingualText text={patchiBilingual(name)} />
    </button>
  );
}

export function PatchiFilterChips({
  selected,
  onSelect,
  includeAll = true,
  ariaLabel,
  mobileSplit = false,
}: PatchiFilterChipsProps) {
  const allChip = includeAll ? (
    <button
      type="button"
      className={`patchi-submenu__btn${
        selected === "all" ? " patchi-submenu__btn--active" : ""
      }`}
      aria-pressed={selected === "all"}
      onClick={() => onSelect("all")}
    >
      <BilingualText text={UI.all} />
    </button>
  ) : null;

  const leadingChipCount = useHomeLeadingChipCount(mobileSplit);

  if (mobileSplit) {
    const leadingBirds = PATCHI_ORDER.slice(0, leadingChipCount);
    const restBirds = PATCHI_ORDER.slice(leadingChipCount);

    return (
      <div className="patchi-filter-chips-home-split" role="group" aria-label={ariaLabel}>
        <div className="patchi-filter-chips patchi-filter-chips--leading patchi-schedule-patchi-picker">
          {leadingBirds.map((name) => (
            <PatchiFilterChipButton
              key={name}
              name={name}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
        <div className="patchi-filter-chips patchi-filter-chips--rest patchi-schedule-patchi-picker">
          {restBirds.map((name) => (
            <PatchiFilterChipButton
              key={name}
              name={name}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
          {allChip}
        </div>
      </div>
    );
  }

  return (
    <div
      className="patchi-filter-chips patchi-schedule-patchi-picker"
      role="group"
      aria-label={ariaLabel}
    >
      {PATCHI_ORDER.map((name) => (
        <PatchiFilterChipButton
          key={name}
          name={name}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
      {allChip}
    </div>
  );
}

export function PatchiPickerBlock({ title, ariaLabel, selected, onSelect }: PatchiPickerBlockProps) {

  return (

    <div className="patchi-picker-block" role="group" aria-label={ariaLabel}>

      <h3 className="patchi-picker-block__title">

        <BilingualText text={title} />

      </h3>

      <div className="patchi-picker-block__chips">

        {PATCHI_ORDER.map((name) => (

          <button

            key={name}

            type="button"

            className={`patchi-submenu__btn${name === selected ? " patchi-submenu__btn--active" : ""}`}

            aria-pressed={name === selected}

            onClick={() => onSelect(name)}

          >

            <BilingualText text={patchiBilingual(name)} />

          </button>

        ))}

      </div>

    </div>

  );

}

