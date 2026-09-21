import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";

export interface NatchathiraPatchiRow {
  number: number;
  natchathira: Bilingual;
  patchi: (typeof PATCHI_ORDER)[number];
}

/** All 27 natchathiras in traditional order (Ashwini → Revati) with their patchi. */
export const NATCHATHIRA_PATCHI_TABLE: NatchathiraPatchiRow[] = [
  { number: 1, natchathira: bi("அசுவினி", "Ashwini"), patchi: "ஆந்தை" },
  { number: 2, natchathira: bi("பரணி", "Bharani"), patchi: "வல்லூறு" },
  { number: 3, natchathira: bi("கிருத்திகை", "Krithikai"), patchi: "மயில்" },
  { number: 4, natchathira: bi("ரோகிணி", "Rohini"), patchi: "கோழி" },
  { number: 5, natchathira: bi("மிருகசீரிடம்", "Mirugaseerisham"), patchi: "காகம்" },
  { number: 6, natchathira: bi("திருவாதிரை", "Thiruvathirai"), patchi: "ஆந்தை" },
  { number: 7, natchathira: bi("புனர்பூசம்", "Punarpusam"), patchi: "வல்லூறு" },
  { number: 8, natchathira: bi("பூசம்", "Poosam"), patchi: "மயில்" },
  { number: 9, natchathira: bi("ஆயில்யம்", "Ayilyam"), patchi: "கோழி" },
  { number: 10, natchathira: bi("மகம்", "Magam"), patchi: "காகம்" },
  { number: 11, natchathira: bi("பூரம்", "Pooram"), patchi: "ஆந்தை" },
  { number: 12, natchathira: bi("உத்திரம்", "Uthiram"), patchi: "வல்லூறு" },
  { number: 13, natchathira: bi("ஹஸ்தம்", "Hastham"), patchi: "மயில்" },
  { number: 14, natchathira: bi("சித்திரை", "Chithirai"), patchi: "கோழி" },
  { number: 15, natchathira: bi("சுவாதி", "Swathi"), patchi: "கோழி" },
  { number: 16, natchathira: bi("விசாகம்", "Visakam"), patchi: "மயில்" },
  { number: 17, natchathira: bi("அனுஷம்", "Anusham"), patchi: "வல்லூறு" },
  { number: 18, natchathira: bi("கேட்டை", "Kettai"), patchi: "ஆந்தை" },
  { number: 19, natchathira: bi("மூலம்", "Moolam"), patchi: "காகம்" },
  { number: 20, natchathira: bi("பூரடம்", "Pooradam"), patchi: "கோழி" },
  { number: 21, natchathira: bi("உத்திராடம்", "Uthiradam"), patchi: "மயில்" },
  { number: 22, natchathira: bi("திருவோணம்", "Thiruvonam"), patchi: "வல்லூறு" },
  { number: 23, natchathira: bi("அவிட்டம்", "Avittam"), patchi: "ஆந்தை" },
  { number: 24, natchathira: bi("சதயம்", "Sadayam"), patchi: "காகம்" },
  { number: 25, natchathira: bi("பூரட்டாதி", "Poorattathi"), patchi: "கோழி" },
  { number: 26, natchathira: bi("உத்திரட்டாதி", "Uthirattathi"), patchi: "மயில்" },
  { number: 27, natchathira: bi("ரேவதி", "Revathi"), patchi: "வல்லூறு" },
];
