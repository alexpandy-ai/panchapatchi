import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";

export interface NatchathiraPatchiRow {
  number: number;
  natchathira: Bilingual;
  patchi: (typeof PATCHI_ORDER)[number];
}

/** All 27 natchathiras in traditional order (Aswini → Revati) with their patchi. */
export const NATCHATHIRA_PATCHI_TABLE: NatchathiraPatchiRow[] = [
  { number: 1, natchathira: bi("அஸ்வினி", "Aswini"), patchi: "ஆந்தை" },
  { number: 2, natchathira: bi("பரணி", "Bharani"), patchi: "வல்லூறு" },
  { number: 3, natchathira: bi("கிருத்திகை", "Karthigai"), patchi: "மயில்" },
  { number: 4, natchathira: bi("ரோகிணி", "Rohini"), patchi: "கோழி" },
  { number: 5, natchathira: bi("மிருகசீரிஷம்", "Mirugaseerisham"), patchi: "காகம்" },
  { number: 6, natchathira: bi("திருவாதிரை", "Thiruvathirai"), patchi: "ஆந்தை" },
  { number: 7, natchathira: bi("புனர் பூசம்", "Punarpusam"), patchi: "வல்லூறு" },
  { number: 8, natchathira: bi("பூசம்", "Poosam"), patchi: "மயில்" },
  { number: 9, natchathira: bi("ஆயில்யம்", "Ayilyam"), patchi: "கோழி" },
  { number: 10, natchathira: bi("மகம்", "Magam"), patchi: "காகம்" },
  { number: 11, natchathira: bi("பூரம்", "Pooram"), patchi: "ஆந்தை" },
  { number: 12, natchathira: bi("உத்திரம்", "Uthiram"), patchi: "வல்லூறு" },
  { number: 13, natchathira: bi("அஸ்தம்", "Astham"), patchi: "மயில்" },
  { number: 14, natchathira: bi("சித்திரை", "Chithirai"), patchi: "கோழி" },
  { number: 15, natchathira: bi("ஸ்வாதி", "Swathi"), patchi: "கோழி" },
  { number: 16, natchathira: bi("விசாகம்", "Visakam"), patchi: "மயில்" },
  { number: 17, natchathira: bi("அனுஷம்", "Anusham"), patchi: "வல்லூறு" },
  { number: 18, natchathira: bi("கேட்டை", "Kettai"), patchi: "ஆந்தை" },
  { number: 19, natchathira: bi("மூலம்", "Moolam"), patchi: "காகம்" },
  { number: 20, natchathira: bi("பூராடம்", "Pooradam"), patchi: "கோழி" },
  { number: 21, natchathira: bi("உத்திராடம்", "Uthiradam"), patchi: "மயில்" },
  { number: 22, natchathira: bi("திருவோணம்", "Thiruvonam"), patchi: "வல்லூறு" },
  { number: 23, natchathira: bi("அவிட்டம்", "Avittam"), patchi: "ஆந்தை" },
  { number: 24, natchathira: bi("சதயம்", "Sadayam"), patchi: "காகம்" },
  { number: 25, natchathira: bi("பூரட்டாதி", "Poorattathi"), patchi: "கோழி" },
  { number: 26, natchathira: bi("உத்திரட்டாதி", "Uthirattathi"), patchi: "மயில்" },
  { number: 27, natchathira: bi("ரேவதி", "Revathi"), patchi: "வல்லூறு" },
];

function natchathiraAt(number: number): Bilingual {
  return NATCHATHIRA_PATCHI_TABLE[number - 1]!.natchathira;
}

export interface NatchathiraPatchiGridRow {
  patchi: (typeof PATCHI_ORDER)[number];
  left: (Bilingual | null)[];
  right: (Bilingual | null)[];
}

/** Information table: 3 natchathiras, patchi, 3 natchathiras (screenshot layout). */
export const NATCHATHIRA_PATCHI_GRID: NatchathiraPatchiGridRow[] = [
  {
    patchi: "ஆந்தை",
    left: [natchathiraAt(1), natchathiraAt(6), natchathiraAt(11)],
    right: [natchathiraAt(18), natchathiraAt(23), null],
  },
  {
    patchi: "வல்லூறு",
    left: [natchathiraAt(2), natchathiraAt(7), natchathiraAt(12)],
    right: [natchathiraAt(17), natchathiraAt(22), natchathiraAt(27)],
  },
  {
    patchi: "மயில்",
    left: [natchathiraAt(3), natchathiraAt(8), natchathiraAt(13)],
    right: [natchathiraAt(16), natchathiraAt(21), natchathiraAt(26)],
  },
  {
    patchi: "கோழி",
    left: [natchathiraAt(4), natchathiraAt(9), natchathiraAt(14)],
    right: [natchathiraAt(15), natchathiraAt(20), natchathiraAt(25)],
  },
  {
    patchi: "காகம்",
    left: [natchathiraAt(5), natchathiraAt(10), null],
    right: [null, natchathiraAt(19), natchathiraAt(24)],
  },
];
