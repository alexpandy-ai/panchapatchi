import { bi, type Bilingual } from "./bilingual";

export const MOON_UI = {
  todayKolkata: bi("இன்று (ஆசியா/கொல்கத்தா)", "Today (Asia/Kolkata)"),
  month: bi("மாதம்", "Month"),
  year: bi("ஆண்டு", "Year"),
  previousMonth: bi("முந்தைய மாதம்", "Previous month"),
  nextMonth: bi("அடுத்த மாதம்", "Next month"),
  moonPhase: bi("நிலவு கட்டம்", "Moon phase"),
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
