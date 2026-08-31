export interface Bilingual {
  ta: string;
  en: string;
}

export function bi(ta: string, en: string): Bilingual {
  return { ta, en };
}

export function formatBilingual({ ta, en }: Bilingual, separator = " · "): string {
  return `${ta}${separator}${en}`;
}

/** Activity labels from Excel (full + short forms). */
const ACTIVITY_EN: Record<string, string> = {
  ஊண்: "Eating",
  ஊ: "Eating",
  சாவு: "Dying",
  சா: "Dying",
  துயில்: "Sleeping",
  து: "Sleeping",
  அரசு: "Ruling",
  அ: "Ruling",
  நடை: "Walking",
  ந: "Walking",
};

export function activityBilingual(label: string): Bilingual {
  const ta = label.trim();
  const en = ACTIVITY_EN[ta] ?? ta;
  return bi(ta, en);
}

export const UI = {
  appTitle: bi("பஞ்ச பட்சி", "Pancha Patchi"),
  menu: bi("பட்டியல்", "Menu"),
  openMenu: bi("மெனு திறக்க", "Open menu"),
  closeMenu: bi("மெனு மூடு", "Close menu"),
  appMenu: bi("பயன்பாட்டு மெனு", "App menu"),
  date: bi("தேதி", "Date"),
  time: bi("நேரம்", "Time"),
  location: bi("இடம்", "Location"),
  coordinates: bi("இடம் ஆயங்கள்", "Coordinates"),
  latitude: bi("அட்சரேகை", "Lat"),
  longitude: bi("தீர்க்கரேகை", "Lng"),
  submitLocation: bi("சமர்ப்பி", "Submit"),
  updateLocation: bi("புதுப்பி", "Update"),
  dateTime: bi("தேதி மற்றும் நேரம்", "Date and time"),
  day: bi("நாள்", "Day"),
  group: bi("குழு", "Group"),
  jamam: bi("ஜாமம்", "Jamam"),
  paksha: bi("பக்ஷம்", "Paksha"),
  dayGroup: bi("நாள் குழு", "Day group"),
  period: bi("பகுதி", "Period"),
  action: bi("செயல்", "Activity"),
  patchi: bi("பட்சி", "Bird"),
  status: bi("நிலை", "Status"),
  dayTime: bi("பகல் நேரம்", "Day time"),
  nightTime: bi("இரவு நேரம்", "Night time"),
  today: bi("இன்று", "Today"),
  now: bi("நடப்பில்", "Now"),
  nextJamam: bi("அடுத்த ஜாமம்", "Next jamam"),
  currentJamam: bi("தற்போதைய ஜாமம்", "Current jamam"),
  selectedDate: bi("தேர்ந்தெடுக்கப்பட்ட தேதி", "Selected date"),
  sunrise: bi("சூரியோதயம்", "Sunrise"),
  sunset: bi("சூரியாஸ்தமனம்", "Sunset"),
  nextSunrise: bi("அடுத்த நாள் சூரியோதயம்", "Next sunrise"),
  loading: bi("தரவு ஏற்றுகிறது…", "Loading data…"),
  loadError: bi("தரவை ஏற்ற முடியவில்லை. பக்கத்தை புதுப்பிக்கவும்.", "Could not load data. Please refresh."),
  noPatchiData: bi("பட்சி தரவு கிடைக்கவில்லை.", "Bird data unavailable."),
  noDayData: bi("இந்த நாளுக்கான தரவு கிடைக்கவில்லை.", "No data for this day."),
  groups: bi("குழுக்கள்", "Groups"),
  jamams: bi("ஜாமங்கள்", "Jamams"),
  schedule: bi("அட்டவணை", "Schedule"),
  sheetPicker: bi("அட்டவணை தேர்வு", "Sheet selection"),
  patchiSubmenu: bi("பட்சி துணை மெனு", "Bird submenu"),
  dayGroupSchedule: bi("நாள் குழு அட்டவணை", "Day group schedule"),
  scheduleSheet: bi("அட்டவணை", "Sheet"),
  currentJamamLabel: bi("தற்போதைய ஜாமம்", "Current jamam"),
  timeTableTitle: bi("நேர அட்டவணை", "Time table"),
  daysTitle: bi("நாட்கள்", "Days"),
} as const;

/** Pancha Patchi day groups in display order (Tamil → English). */
export const PANCHA_DAYS: Bilingual[] = [
  bi("சனி", "Saturday"),
  bi("வியாழன்", "Thursday"),
  bi("செவ்வாய்", "Tuesday"),
  bi("வெள்ளி", "Friday"),
  bi("புதன்", "Wednesday"),
];

export const MENU_ITEMS: { id: string; label: Bilingual }[] = [
  {
    id: "status",
    label: bi("பட்சி நிலை", "Patchi status"),
  },
  {
    id: "find",
    label: bi("பட்சி அறிக", "Know patchi"),
  },
  {
    id: "schedule",
    label: bi("அட்டவணை", "Schedule"),
  },
  {
    id: "days",
    label: bi("நாட்கள்", "Days"),
  },
];

export const PAKSHA_BI: Record<"valarpirai" | "theipirai", Bilingual> = {
  valarpirai: bi("வளர்பிறை", "Waxing moon"),
  theipirai: bi("தேய்பிறை", "Waning moon"),
};

export const PERIOD_BI: Record<"day" | "night", Bilingual> = {
  day: bi("பகல்", "Day"),
  night: bi("இரவு", "Night"),
};

export const WEEKDAY_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_GROUP_EN: Record<string, string> = {
  பு: "Wednesday, Saturday",
  வெ: "Friday",
  செ: "Sunday, Tuesday",
  வி: "Thursday",
  ச: "Monday",
};

const PANCHA_AVAILABLE_WEEKDAY_SET = new Set([6, 4, 2, 5, 3]);

const TAMIL_WEEKDAY_NAMES = [
  "ஞாயிறு",
  "திங்கள்",
  "செவ்வாய்",
  "புதன்",
  "வியாழன்",
  "வெள்ளி",
  "சனி",
] as const;

function panchaDisplayWeekday(weekdayIndex: number): number {
  let day = ((weekdayIndex % 7) + 7) % 7;
  for (let i = 0; i < 7; i++) {
    if (PANCHA_AVAILABLE_WEEKDAY_SET.has(day)) return day;
    day = (day - 1 + 7) % 7;
  }
  return 6;
}

/** Bilingual weekday for Pancha Patchi display (Sun/Mon → previous Pancha day). */
export function weekdayBilingual(weekdayIndex: number): Bilingual {
  const displayWeekday = panchaDisplayWeekday(weekdayIndex);
  const ta = TAMIL_WEEKDAY_NAMES[displayWeekday] ?? "";
  const en = WEEKDAY_EN[displayWeekday] ?? "";
  return bi(ta, en);
}

export function dayGroupBilingual(key: string, taLabel: string): Bilingual {
  return bi(taLabel, DAY_GROUP_EN[key] ?? taLabel);
}

export function jamamBilingual(index: number): Bilingual {
  return bi(`ஜாமம் ${index}`, `Jamam ${index}`);
}

/** Display jamam label for an Excel yama (1–5) in the given period. */
export function jamamBilingualForYama(yama: number, period: "day" | "night"): Bilingual {
  const index = period === "day" ? yama : yama + 5;
  return jamamBilingual(index);
}

export function durationBilingual(h: number, m: number): Bilingual {
  if (h === 0) return bi(`${m} நிமிடம்`, `${m} min`);
  if (m === 0) return bi(`${h} மணி`, `${h} hr`);
  return bi(`${h} மணி ${m} நிமிடம்`, `${h} hr ${m} min`);
}

export const PATCHI_EN: Record<string, string> = {
  காகம்: "Crow",
  வல்லூறு: "Eagle",
  கோழி: "Hen",
  ஆந்தை: "Owl",
  மயில்: "Peacock",
};

/** Bird emojis for the five Pancha Pakshi birds. */
export const PATCHI_SYMBOL: Record<string, string> = {
  காகம்: "🐦‍⬛",
  வல்லூறு: "🦅",
  கோழி: "🐔",
  ஆந்தை: "🦉",
  மயில்: "🦚",
};

export function patchiBaseName(name: string): string {
  return name
    .replace(/[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]+/gu, "")
    .trim();
}

export function formatPatchiName(name: string): string {
  const base = patchiBaseName(name) || name.trim();
  const symbol = PATCHI_SYMBOL[base];
  return symbol ? `${base} ${symbol}` : name.trim();
}

export function patchiBilingual(name: string): Bilingual {
  const base = patchiBaseName(name) || name.trim();
  const symbol = PATCHI_SYMBOL[base];
  const ta = symbol ? `${base} ${symbol}` : name.trim();
  const en = PATCHI_EN[base] ?? base;
  return bi(ta, en);
}

export function sectionLabelBilingual(label: string): Bilingual {
  if (label === "பகல்") return PERIOD_BI.day;
  if (label === "இரவு") return PERIOD_BI.night;
  return bi(label, label);
}

export function pakshaLabelBilingual(pakshaId: "valarpirai" | "theipirai"): Bilingual {
  return PAKSHA_BI[pakshaId];
}
