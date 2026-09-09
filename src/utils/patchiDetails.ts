import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";

export interface PatchiDetailRow {
  patchi: (typeof PATCHI_ORDER)[number];
  color: Bilingual;
  number: number;
  direction: Bilingual;
}

/** Patchi color, number, and direction — from reference sheet. */
export const PATCHI_DETAILS_TABLE: PatchiDetailRow[] = [
  {
    patchi: "காகம்",
    color: bi("வெள்ளை", "White"),
    number: 3,
    direction: bi("மேற்கு", "West"),
  },
  {
    patchi: "வல்லூறு",
    color: bi("சிவப்பு", "Red"),
    number: 2,
    direction: bi("கிழக்கு", "East"),
  },
  {
    patchi: "கோழி",
    color: bi("மஞ்சள்", "Yellow"),
    number: 1,
    direction: bi("வடக்கு", "North"),
  },
  {
    patchi: "ஆந்தை",
    color: bi("பச்சை", "Green"),
    number: 4,
    direction: bi("தெற்கு", "South"),
  },
  {
    patchi: "மயில்",
    color: bi("கருப்பு (நீலம்)", "Black (Blue)"),
    number: 5,
    direction: bi("மத்தி (நடு)", "Center (Middle)"),
  },
];
