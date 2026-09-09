import { BilingualText } from "./BilingualText";

import { PATCHI_ORDER, patchiBilingual, UI, type Bilingual } from "../utils/bilingual";



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
}

export function PatchiFilterChips({
  selected,
  onSelect,
  includeAll = true,
  ariaLabel,
}: PatchiFilterChipsProps) {
  return (
    <div
      className="patchi-filter-chips patchi-schedule-patchi-picker"
      role="group"
      aria-label={ariaLabel}
    >
      {PATCHI_ORDER.map((name) => (
        <button
          key={name}
          type="button"
          className={`patchi-submenu__btn${
            name === selected ? " patchi-submenu__btn--active" : ""
          }`}
          aria-pressed={name === selected}
          onClick={() => onSelect(name)}
        >
          <BilingualText text={patchiBilingual(name)} />
        </button>
      ))}
      {includeAll ? (
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
      ) : null}
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

