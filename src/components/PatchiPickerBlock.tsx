import { BilingualText } from "./BilingualText";

import { PATCHI_ORDER, patchiBilingual, type Bilingual } from "../utils/bilingual";



type PatchiName = (typeof PATCHI_ORDER)[number];



interface PatchiPickerBlockProps {

  title: Bilingual;

  ariaLabel: string;

  selected: PatchiName;

  onSelect: (patchi: PatchiName) => void;

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

