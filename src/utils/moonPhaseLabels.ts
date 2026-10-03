import { bi, type Bilingual } from "./bilingual";

export const MOON_UI = {
  todayKolkata: bi("இன்று (ஆசியா/கொல்கத்தா)", "Today (Asia/Kolkata)"),
  month: bi("மாதம்", "Month"),
  year: bi("ஆண்டு", "Year"),
  previousMonth: bi("முந்தைய மாதம்", "Previous month"),
  nextMonth: bi("அடுத்த மாதம்", "Next month"),
  moonPhase: bi("நிலவு கட்டம்", "Moon phase"),
  thithiHeader: bi("திதி", "Thithi"),
  illumination: bi("ஒளியளவு", "Illumination"),
  phaseAtLocalNoon: bi(
    "இடத்தின் நண்பகலில் நிலவு கட்டம் (phase at local noon)",
    "phase at local noon",
  ),
  notTithi: bi(
    "இவை நிலவு கட்டங்கள். 30 திதிகள் அல்ல.",
    "These are Moon phases, not the 30 tithis.",
  ),
  exactEvent: bi("துல்லிய கட்டம் (ஆசியா/கொல்கத்தா)", "Exact phase (Asia/Kolkata)"),
  loading: bi("நிலவு கட்டங்கள் ஏறுகின்றன…", "Loading moon phases…"),
  locating: bi("இடம் கண்டறிகிறது…", "Detecting location…"),
  loadError: bi(
    "நிலவு கட்டங்களை ஏற்ற முடியவில்லை.",
    "Could not load moon phases.",
  ),
  retry: bi("மீண்டும் முயற்சி", "Retry"),
  defaultPlace: bi(
    "இடம் தேர்ந்தெடுக்கப்படவில்லை. சென்னை ஆயங்கள் பயன்படுத்தப்படுகின்றன.",
    "No place selected. Using Chennai coordinates.",
  ),
} as const;

export const GREGORIAN_MONTHS: readonly Bilingual[] = [
  bi("ஜனவரி", "January"),
  bi("பிப்ரவரி", "February"),
  bi("மார்ச்", "March"),
  bi("ஏப்ரல்", "April"),
  bi("மே", "May"),
  bi("ஜூன்", "June"),
  bi("ஜூலை", "July"),
  bi("ஆகஸ்ட்", "August"),
  bi("செப்டம்பர்", "September"),
  bi("அக்டோபர்", "October"),
  bi("நவம்பர்", "November"),
  bi("டிசம்பர்", "December"),
];

/** Real Gregorian weekdays. Not the Pancha Patchi weekday remap. */
export const CALENDAR_WEEKDAYS: readonly Bilingual[] = [
  bi("ஞாயிறு", "Sunday"),
  bi("திங்கள்", "Monday"),
  bi("செவ்வாய்", "Tuesday"),
  bi("புதன்", "Wednesday"),
  bi("வியாழன்", "Thursday"),
  bi("வெள்ளி", "Friday"),
  bi("சனி", "Saturday"),
];

export const USNO_YEAR_MIN = 1700;
export const USNO_YEAR_MAX = 2100;

/**
 * The 30 thithis in lunar-month order, starting from Valarpirai (waxing) Prathamai.
 * Index 14 = Pournami (full moon day). Index 29 = Amavasya (new moon day).
 */
export interface ThithiLabel {
  ta: string;
  en: string;
  paksha: "வளர்பிறை" | "தேய்பிறை";
}

export const THITHI_SEQUENCE: readonly ThithiLabel[] = [
  // Valarpirai (waxing) 1–15
  { ta: "பிரதமை",    en: "Prathamai",  paksha: "வளர்பிறை" },
  { ta: "துவிதியை",  en: "Dwitiyai",   paksha: "வளர்பிறை" },
  { ta: "திரிதியை",  en: "Trithiyai",  paksha: "வளர்பிறை" },
  { ta: "சதுர்த்தி", en: "Chathurthi", paksha: "வளர்பிறை" },
  { ta: "பஞ்சமி",   en: "Panchami",   paksha: "வளர்பிறை" },
  { ta: "சஷ்டி",    en: "Sashti",     paksha: "வளர்பிறை" },
  { ta: "சப்தமி",   en: "Sapthami",   paksha: "வளர்பிறை" },
  { ta: "அஷ்டமி",   en: "Ashtami",    paksha: "வளர்பிறை" },
  { ta: "நவமி",     en: "Navami",     paksha: "வளர்பிறை" },
  { ta: "தசமி",     en: "Dasami",     paksha: "வளர்பிறை" },
  { ta: "ஏகாதசி",   en: "Ekadasi",    paksha: "வளர்பிறை" },
  { ta: "துவாதசி",  en: "Dwadasi",    paksha: "வளர்பிறை" },
  { ta: "திரியோதசி",en: "Trayodasi",  paksha: "வளர்பிறை" },
  { ta: "சதுர்தசி", en: "Chaturdasi", paksha: "வளர்பிறை" },
  { ta: "பௌர்ணமி", en: "Pournami",   paksha: "வளர்பிறை" }, // index 14
  // Theipirai (waning) 1–15
  { ta: "பிரதமை",    en: "Prathamai",  paksha: "தேய்பிறை" },
  { ta: "துவிதியை",  en: "Dwitiyai",   paksha: "தேய்பிறை" },
  { ta: "திரிதியை",  en: "Trithiyai",  paksha: "தேய்பிறை" },
  { ta: "சதுர்த்தி", en: "Chathurthi", paksha: "தேய்பிறை" },
  { ta: "பஞ்சமி",   en: "Panchami",   paksha: "தேய்பிறை" },
  { ta: "சஷ்டி",    en: "Sashti",     paksha: "தேய்பிறை" },
  { ta: "சப்தமி",   en: "Sapthami",   paksha: "தேய்பிறை" },
  { ta: "அஷ்டமி",   en: "Ashtami",    paksha: "தேய்பிறை" },
  { ta: "நவமி",     en: "Navami",     paksha: "தேய்பிறை" },
  { ta: "தசமி",     en: "Dasami",     paksha: "தேய்பிறை" },
  { ta: "ஏகாதசி",   en: "Ekadasi",    paksha: "தேய்பிறை" },
  { ta: "துவாதசி",  en: "Dwadasi",    paksha: "தேய்பிறை" },
  { ta: "திரியோதசி",en: "Trayodasi",  paksha: "தேய்பிறை" },
  { ta: "சதுர்தசி", en: "Chaturdasi", paksha: "தேய்பிறை" },
  { ta: "அமாவாசை",  en: "Amavasya",   paksha: "தேய்பிறை" }, // index 29
] as const;

/** 0-based index of Pournami in THITHI_SEQUENCE. */
export const POURNAMI_THITHI_INDEX = 14;

/** IST hour at or after which the full moon is considered to fall on the *next* morning. */
export const FULL_MOON_SUNSET_HOUR = 18;
