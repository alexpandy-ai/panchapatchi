import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";

/** Nakshatra names grouped by patchi — column order from Sheet5 (Owl → Crow). */
export const NATCHATHIRA_PATCHI_COLUMNS: {
  patchi: (typeof PATCHI_ORDER)[number];
  natchathiras: readonly Bilingual[];
}[] = [
  {
    patchi: "ஆந்தை",
    natchathiras: [
      bi("அசுவினி", "Ashwini"),
      bi("திருவாதிரை", "Thiruvathirai"),
      bi("பூரம்", "Pooram"),
      bi("கேட்டை", "Kettai"),
      bi("அவிட்டம்", "Avittam"),
    ],
  },
  {
    patchi: "வல்லூறு",
    natchathiras: [
      bi("பரணி", "Bharani"),
      bi("புனர்பூசம்", "Punarpusam"),
      bi("உத்திரம்", "Uthiram"),
      bi("அனுஷம்", "Anusham"),
      bi("திருவோணம்", "Thiruvonam"),
      bi("ரேவதி", "Revathi"),
    ],
  },
  {
    patchi: "மயில்",
    natchathiras: [
      bi("கிருத்திகை", "Krithikai"),
      bi("பூசம்", "Poosam"),
      bi("ஹஸ்தம்", "Hastham"),
      bi("விசாகம்", "Visakam"),
      bi("உத்திராடம்", "Uthiradam"),
      bi("உத்திரட்டாதி", "Uthirattathi"),
    ],
  },
  {
    patchi: "கோழி",
    natchathiras: [
      bi("ரோகிணி", "Rohini"),
      bi("ஆயில்யம்", "Ayilyam"),
      bi("சித்திரை", "Chithirai"),
      bi("சுவாதி", "Swathi"),
      bi("பூரடம்", "Pooradam"),
      bi("பூரட்டாதி", "Poorattathi"),
    ],
  },
  {
    patchi: "காகம்",
    natchathiras: [
      bi("மிருகசீரிடம்", "Mirugaseerisham"),
      bi("மகம்", "Magam"),
      bi("மூலம்", "Moolam"),
      bi("சதயம்", "Sadayam"),
    ],
  },
];

export const NATCHATHIRA_PATCHI_ROW_COUNT = Math.max(
  ...NATCHATHIRA_PATCHI_COLUMNS.map((column) => column.natchathiras.length),
);
