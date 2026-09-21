import { bi, PATCHI_ORDER, type Bilingual } from "./bilingual";

export interface VazhipattuThalangalRow {
  patchi: (typeof PATCHI_ORDER)[number];
  temples: readonly Bilingual[];
  pandava: Bilingual | null;
  siddhar: Bilingual | null;
  deva: Bilingual | null;
  otherMatches: readonly Bilingual[];
}

/** Patchi correspondences for worship places and related figures. */
export const VAZHIPATTU_THALANGAL_TABLE: VazhipattuThalangalRow[] = [
  {
    patchi: "காகம்",
    temples: [
      bi("திருவானைக்காவல்", "Thiruvanaikaval"),
      bi("ஸ்ரீரங்கம் (?)", "Srirangam (?)"),
      bi("ஆதிகும்பேஸ்வரர்", "Adikumbeswarar"),
    ],
    pandava: bi("சகாதேவன்", "Sahadevan"),
    siddhar: bi("காகபுஜண்டர்", "Kagabhujandar"),
    deva: null,
    otherMatches: [
      bi("காகர்கொடியோன்", "Kakarkodiyon"),
      bi("சேயோன்", "Seyon"),
      bi("சீரியோன்", "Seeriyon"),
    ],
  },
  {
    patchi: "வல்லூறு",
    temples: [
      bi("திருவண்ணாமலை", "Thiruvannamalai"),
      bi("சக்கரபாணி கோவில்", "Chakrapani Temple"),
    ],
    pandava: bi("நகுலன்", "Nakulan"),
    siddhar: bi("அகத்தியர்", "Agasthiyar"),
    deva: bi("வருணன்", "Varunan"),
    otherMatches: [bi("அருணன்", "Arunan")],
  },
  {
    patchi: "கோழி",
    temples: [
      bi("ஏகாம்பரேஸ்வரர் – காஞ்சி", "Ekambareswarar – Kanchi"),
      bi("ஐராவதேஸ்வரர் (?)", "Airavateswarar (?)"),
    ],
    pandava: bi("அர்ச்சுனன்", "Arjunan"),
    siddhar: bi("போகர்", "Bogar"),
    deva: bi("இந்திரன்", "Indran"),
    otherMatches: [
      bi("ஆதி பிரம்மன்", "Adi Brahman"),
      bi("திருமால்", "Thirumal"),
      bi("கொற்றவை", "Kotravai"),
    ],
  },
  {
    patchi: "ஆந்தை",
    temples: [
      bi("காளஹஸ்தி", "Kalahasti"),
      bi("தென்காசி விஸ்வநாதர்", "Tenkasi Viswanathar"),
    ],
    pandava: bi("பீமன்", "Bheeman"),
    siddhar: bi("தன்வந்திரி", "Dhanvantari"),
    deva: bi("வாயு", "Vayu"),
    otherMatches: [bi("அனுமன்", "Hanuman")],
  },
  {
    patchi: "மயில்",
    temples: [
      bi("தில்லை நடராஜன்", "Thillai Natarajan"),
      bi("மயூரநாதன்", "Mayuranathan"),
    ],
    pandava: bi("தர்மன்", "Dharman"),
    siddhar: bi("திருமூலர்", "Thirumoolar"),
    deva: null,
    otherMatches: [bi("ராமர்", "Ramar"), bi("கிருஷ்ணர்", "Krishnan")],
  },
];
