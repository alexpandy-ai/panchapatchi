import type { AppLanguage } from "../context/LanguageContext";
import { bi, pickBilingual, type Bilingual } from "../utils/bilingual";
import type { PakshaId } from "../utils/paksha";
import { getThithiCellPosition, THITHI_PATCHI_BY_PAKSHA } from "../utils/thithiPatchi";
import type { ReviewReason } from "./calendar";
import { thithiIndexToSelection, type ThithiSelection } from "./thithiIds";

/** Display names only; calculations use calendar indices and {@link ThithiSelection}. */

export const PIRAI_NAMES: Record<PakshaId, Bilingual> = {
  valarpirai: bi("வளர்பிறை", "Valarpirai"),
  theipirai: bi("தேய்பிறை", "Theipirai"),
};

export const UNNAMED_SECTOR = bi("பெயரிடப்படாத பகுதி", "Unnamed sector");

/** Thithi name without the Pirai, from the same Thithi Patchi table Home's selector uses. */
export function thithiNameBi({ pakshaId, thithiNumber }: ThithiSelection): Bilingual {
  const { groupIndex, thithiIndex } = getThithiCellPosition(thithiNumber);
  return THITHI_PATCHI_BY_PAKSHA[pakshaId][groupIndex].thithis[thithiIndex];
}

/** "வளர்பிறை சஷ்டி" / "Valarpirai Sashti"; அமாவாசை and பௌர்ணமி stand alone. */
export function thithiIndexLabelBi(index: number | null): Bilingual {
  if (index === null) return UNNAMED_SECTOR;
  const selection = thithiIndexToSelection(index);
  const name = thithiNameBi(selection);
  if (selection.thithiNumber === 15) return name;
  const pirai = PIRAI_NAMES[selection.pakshaId];
  return bi(`${pirai.ta} ${name.ta}`, `${pirai.en} ${name.en}`);
}

export function thithiIndexLabel(index: number | null, language: AppLanguage): string {
  return pickBilingual(thithiIndexLabelBi(index), language);
}

/** Thithi name without the Pirai; unnamed sectors keep their label. */
export function thithiNameLabel(index: number | null, language: AppLanguage): string {
  return pickBilingual(index === null ? UNNAMED_SECTOR : thithiNameBi(thithiIndexToSelection(index)), language);
}

const MONTH_NAMES: readonly Bilingual[] = [
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

export const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

export function monthName(month: number, language: AppLanguage): string {
  const name = MONTH_NAMES[month - 1];
  return name ? pickBilingual(name, language) : "";
}

export function placeLocale(language: AppLanguage): string {
  return language === "ta" ? "ta-IN" : "en-IN";
}

export const TD = {
  tabAnnual: bi("ஆண்டு அட்டவணை", "Annual Table"),
  tabChart: bi("ஆண்டு வரைபடம்", "Year Chart"),
  tabDaily: bi("மாத அட்டவணை", "Monthly Table"),
  chipAnnual: bi("ஆண்டு", "Annual"),
  chipChart: bi("வரைபடம்", "Chart"),
  chipDaily: bi("மாதம்", "Month"),
  tabList: bi("திதி அட்டவணை", "Thithi tables"),
  headingDaily: bi("மாதவாரியான திதிகள்", "Thithis by month"),
  legend: bi("● உதய பௌர்ணமி \u00a0 ★ உதய அமாவாசை", "● Sunrise Pournami \u00a0 ★ Sunrise Amavasya"),
  year: bi("ஆண்டு", "Year"),
  month: bi("மாதம்", "Month"),
  computing: bi("கணக்கிடுகிறது…", "Calculating…"),
  calculationFailed: bi("கணக்கீடு தோல்வி", "Calculation failed"),
  outOfRangeShort: bi("தேதி வரம்புக்கு வெளியே", "Date out of range"),
  sunriseFailed: bi("சூரிய உதயம் கணக்கிட முடியவில்லை", "Could not calculate sunrise"),
  reviewDate: bi("கவனிக்க வேண்டிய தேதி", "Date needs review"),
  reviewDates: bi("கவனிக்க வேண்டிய தேதிகள்", "Dates needing review"),
  none: bi("இல்லை", "None"),
  date: bi("தேதி", "Date"),
  thithi: bi("திதி", "Thithi"),
  angleSunsetThithi: bi("கோண–அஸ்தமன விதிப்படி திதி", "Thithi by angle–sunset rule"),
  sunriseThithi: bi("நாட்காட்டித் திதி — இடத்தின் சூரிய உதயம்", "Calendar thithi — sunrise at the place"),
  calculationDate: bi("கணக்கீட்டுத் தேதி", "Calculation date"),
  annualHeading: bi("கோண–அஸ்தமன அடிப்படையிலான திதிகள்", "Thithis by the angle–sunset rule"),
  annualHint: bi(
    "உங்கள் வட்டப்படி 32 × 11.25° பகுதிகள்: 0° அமாவாசை · 90° வளர்பிறை அஷ்டமி · 180° பௌர்ணமி · 270° தேய்பிறை அஷ்டமி. 168.75°–180° மற்றும் 348.75°–360° பெயரிடப்படாத பகுதிகள். ⚠ நிறமிட்ட தேதியை அழுத்தினால் காரணம் தெரியும். அனைத்திற்கும் தேர்ந்தெடுத்த இடத்தின் அஸ்தமன விதி. அடுத்தடுத்த நாட்களில் அதே திதி மீண்டால் மட்டும் கூடுதல் தேதி மறைக்கப்படும்; கோண அடிப்படைத் தேதி இருந்தால் அதற்கு முன்னுரிமை. அதே மாதத்தில் இடைவெளிக்குப் பின் வரும் அதே திதியின் தேதியும் காட்டப்படும்.",
    "Your circle has 32 × 11.25° sectors: 0° Amavasya · 90° Valarpirai Ashtami · 180° Pournami · 270° Theipirai Ashtami. 168.75°–180° and 348.75°–360° are unnamed. Press a ⚠ highlighted date to see why it needs review. Every date uses the selected place's sunset rule. An extra date is hidden only when the same thithi repeats on consecutive days; the angle anchor date takes priority. A later date for the same thithi in the same month, after a gap, is still shown.",
  ),
  listingDates: bi("தேதிப் பட்டியல்", "Listing Dates"),
  eventTime: bi("நேரம்", "time"),
  sunsetInterval: bi("சூரிய அஸ்தமன இடைவெளி", "Sunset interval"),
  fixedSunTimes: bi("உதயம் 6:00 / அஸ்தமனம் 18:00", "Sunrise 6:00 / Sunset 18:00"),
  methodSummary: bi("கணக்கீட்டு விதி மற்றும் ஆதாரம்", "Calculation rule and sources"),
  method1: bi(
    "உங்கள் வட்டத்தின் 32 பகுதிகள் ஒவ்வொன்றும் 11.25°. 0°–11.25° அமாவாசை; அடுத்து பிரதமை, துவிதியை … சதுர்தசி. 180°–191.25° பௌர்ணமி; அடுத்து தேய்பிறை பிரதமை … சதுர்தசி. 168.75°–180° மற்றும் 348.75°–360° பகுதிகளுக்கு இன்னும் பெயர் ஒதுக்கப்படவில்லை.",
    "Each of the 32 sectors of your circle is 11.25°. 0°–11.25° is Amavasya, followed by Prathamai, Dwitiyai … Chaturdasi. 180°–191.25° is Pournami, followed by Theipirai Prathamai … Chaturdasi. 168.75°–180° and 348.75°–360° have no name yet.",
  ),
  method2: bi(
    "ஒவ்வொரு தொடக்கக் கோணத்தையும் அடையும் நேரம் தேர்ந்தெடுத்த இடத்தின் அஸ்தமனத்திற்கு முன் என்றால் அதே தேதி; அஸ்தமனத்தில் அல்லது அதற்குப் பின் என்றால் அடுத்த தேதி. இது உங்கள் தனிப்பட்ட வட்ட விதி; வழக்கமான 12° பஞ்சாங்கக் கணக்கீட்டிலிருந்து தனியானது. பல எல்லைகள் ஒரே தேதியில் வருதல், மீளும்/விடுபடும் பகுதிகள், பெயரிடப்படாத பகுதிகள் ஆகியவை கவனிக்க வேண்டியவையாகக் குறிக்கப்படும். தேதியை அழுத்தினால் காரணம் தெரியும்.",
    "If a sector's starting angle is reached before sunset at the selected place, it belongs to that date; at or after sunset, to the next date. This is your own circle rule, separate from the usual 12° panchangam calculation. Several boundaries on one date, repeated or skipped sectors, and unnamed sectors are flagged for review. Press a date to see why.",
  ),
  method3: bi(
    "நாட்காட்டித் தேதி நள்ளிரவில் மாறும்; ஆனால் தினசரித் திதியும் ஜாமச் சுழற்சியும் தேர்ந்தெடுத்த இடத்தின் சூரிய உதயத்தில்தான் மாறும். தேர்ந்தெடுத்த நேரம் அன்றைய சூரிய உதயத்திற்கு முன் என்றால் முந்தைய தேதியின் திதி; உதயத்தில் அல்லது பின் என்றால் அன்றைய தேதியின் திதி, அடுத்த சூரிய உதயம் வரை. தேர்ந்தெடுத்த தேதி / நேரம் இடத்தின் நேர மண்டலத்தின் கடிகார நேரமாகக் கொள்ளப்படுகிறது. மேலே உள்ள கோண–அஸ்தமன ஒதுக்கீடு மாறாது. முகப்புப் பக்கத்தின் பிறை / திதியும் இதே கணக்கீட்டைப் பயன்படுத்துகிறது.",
    "The civil date changes at midnight, but the daily thithi and the jamam cycle change at sunrise at the selected place. Before that day's sunrise the previous date's thithi applies; at or after sunrise, that date's thithi applies until the next sunrise. The selected date and time are read as wall-clock time in the place's time zone. The angle–sunset assignment above is unchanged. Home's Pirai and Thithi use this same calculation.",
  ),
  method4: bi(
    "ஆண்டு அட்டவணையில் ● உதய பௌர்ணமி, ★ உதய அமாவாசை. “உதய திதி” சந்திரன்–சூரியன் geocentric longitude வித்தியாசத்தை 12° பகுதிகளாகப் பிரித்து இடத்தின் சூரிய உதயத்தில் கணக்கிடப்பட்டவை. Moon App வரலாற்றுத் தரவு வழங்கப்படாததால் அதன் தரவாக இவை குறிப்பிடப்படவில்லை.",
    "In the annual table ● marks sunrise Pournami and ★ sunrise Amavasya. The “sunrise thithi” divides the Moon–Sun geocentric longitude difference into 12° parts, evaluated at sunrise at the place. Moon App historical data is not available, so these are not presented as its data.",
  ),
  method5: bi(
    "இங்கு முழுநிலவு என்பது 180° வானியல் phase நேரம்; app-இல் rounding செய்யப்பட்ட 100% illumination நேரம் அல்ல.",
    "Full moon here is the astronomical 180° phase time, not an app's rounded 100% illumination time.",
  ),
  place: bi("இடம்", "Place"),
  placeZoneNote: bi(" தேதிகள் இந்த இடத்தின் நேர மண்டலப்படி.", " Dates follow this place's time zone."),
  fixedPlaceNote: bi(
    " இடம் கிடைக்காததால் app-இன் இயல்புப்படி சூரிய உதயம் 6:00, அஸ்தமனம் 18:00 (சாதன நேர மண்டலம்) கொள்ளப்படுகிறது.",
    " No location is available, so the app default of sunrise 6:00 and sunset 18:00 (device time zone) is used.",
  ),
  sources: bi("ஆதாரம்", "Sources"),
  usnoLink: bi("USNO நிலவு phase விளக்கம்", "USNO Moon phase explanation"),
  footer: bi("பிரதமை முதல் பௌர்ணமி வரை · உங்கள் தினசரி திதி வரிசை", "Prathamai to Pournami · your daily thithi sequence"),
  chartEmpty: bi("இந்த மாதத்துக்கு சந்திர வரைபடம் இல்லை.", "No Moon chart for this month."),
  chartBasis: bi("கோண வகை", "Angle basis"),
  chartBasisPhase: bi("சந்திரன் − சூரியன் · திதி வட்டம்", "Moon − Sun · thithi circle"),
  chartBasisLongitude: bi("சந்திரன் geocentric tropical longitude", "Moon geocentric tropical longitude"),
  chartPause: bi("⏸ நிறுத்து", "⏸ Pause"),
  chartPlay: bi("▶ இயக்கு", "▶ Play"),
  chartSunset: bi("அஸ்தமனம்", "Sunset"),
  chartPhase: bi("சந்திரன் − சூரியன்", "Moon − Sun"),
  chartLongitude: bi("சந்திரன் longitude", "Moon longitude"),
  chartDistance: bi("பூமி–சந்திரன் மையத் தூரம்", "Earth–Moon centre distance"),
  chartTravelled: bi("மாதத் தொடக்கத்திலிருந்து பயணம்", "Travelled since month start"),
  chartEarth: bi("பூமி · 0 km", "Earth · 0 km"),
  chartScale: bi("100,000 km · நேரியல் தூர அளவுகோல்", "100,000 km · linear distance scale"),
  chartAria: bi(
    "மாதத்தின் சந்திர நிலைகள்; பூமி மையத்தில், 0° இடப்பக்கம்; ஒரு அலகு 3000 கி.மீ.",
    "Monthly Moon positions with Earth at centre and zero degrees to the left; radial distances use one chart unit per 3000 kilometres",
  ),
  chartHint: bi(
    "பூமி மையத்தில் · 0° இடப்பக்கம் · ஒவ்வொரு நாளும் தேர்ந்தெடுத்த இடத்தின் அஸ்தமன நேரம். உள்வட்டப் பாதை மாதத்தின் சந்திரப் பயணம்; எண்கள் தேதிகள். மையத்திலிருந்து தூரம் நேரியல் அளவுகோலில் (கி.மீ.) உள்ளது. பூமி/சந்திரன் குறியீடுகள் தெரிவதற்காகப் பெரிதாக்கப்பட்டுள்ளன; அவற்றின் விட்டங்கள் இந்த அளவுகோலில் இல்லை. திதி முறையில் கோணம் சூரியனை ஒப்பிட்டது; longitude முறையில் நிலையான tropical 0° குறிப்பு. இது longitude–distance வரைபடம்; முப்பரிமாணச் சுற்றுப்பாதையின் தளத்தோற்றம் அல்ல.",
    "Earth at centre · 0° to the left · each day at sunset at the selected place. The inner track is the Moon's path this month; numbers are dates. Distance from the centre is on a linear scale (km). The Earth and Moon symbols are enlarged for visibility; their diameters are not to this scale. In thithi mode the angle is relative to the Sun; in longitude mode it uses the fixed tropical 0° reference. This is a longitude–distance chart, not a plan view of the three-dimensional orbit.",
  ),
  sectorChartAria: bi(
    "11.25° அளவிலான 32 பகுதிகள். அமாவாசை 0°–11.25°; அடுத்தடுத்த திதிகள் தொடர் பகுதிகளில். இரண்டு பகுதிகள் பெயரிடப்படவில்லை.",
    "32 sectors of 11.25 degrees. Amavasya occupies 0 to 11.25 degrees; following thithis occupy successive sectors. Two sectors remain unnamed.",
  ),
  homeReviewHint: bi(
    "இந்த நேரத்திற்கு திதி தானாக ஒதுக்கப்படவில்லை. தேவையெனில் பிறை / திதியைக் கைமுறையாகத் தேர்ந்தெடுக்கவும்.",
    "No thithi is assigned automatically for this time. Choose Pirai / Thithi manually if needed.",
  ),
} as const;

export function criticalDateAria(date: string, language: AppLanguage): string {
  return language === "ta"
    ? `${date} · கவனிக்க வேண்டியது; காரணத்தைக் காண அழுத்தவும்`
    : `${date} · needs review; press to see why`;
}

export function outOfRangeText(date: string | null, language: AppLanguage): string {
  const shown = date ?? "—";
  return language === "ta"
    ? `கணக்கீட்டுத் தேதி ${shown} — 1950-01-01 முதல் நடப்பு ஆண்டு இறுதி வரையிலான தேதிகளுக்கு மட்டுமே திதி கிடைக்கும்.`
    : `Calculation date ${shown} — thithi is available only from 1950-01-01 to the end of the current year.`;
}

export function reviewReasonText(reason: ReviewReason, language: AppLanguage): string {
  const ta = language === "ta";
  switch (reason.code) {
    case "unnamedSector":
      return ta
        ? `${reason.angle}°–${reason.endAngle}° பகுதி உங்கள் 32 பிரிவு வட்டத்தில் பெயரிடப்படவில்லை; திதி தானாக ஒதுக்கப்படவில்லை.`
        : `The ${reason.angle}°–${reason.endAngle}° sector is unnamed in your 32-sector circle; no thithi is assigned automatically.`;
    case "unnamedBoundary":
      return ta
        ? "இந்தத் தேதியில் பெயரிடப்படாத பகுதியின் எல்லையும் வருகிறது."
        : "An unnamed sector's boundary also falls on this date.";
    case "multipleBoundaries": {
      const list = reason.events
        .map((event) => `${event.angle}° ${thithiIndexLabel(event.index, language)}`)
        .join(", ");
      return ta
        ? `ஒரே அஸ்தமனத் தேதிக்கு பல கோண எல்லைகள் வருகின்றன: ${list}. முதன்மைக் காட்சியில் கடைசி எல்லை காட்டப்படுகிறது; ஆண்டு அட்டவணையில் எல்லா நிகழ்வுகளும் உள்ளன.`
        : `Several angle boundaries fall on the same sunset date: ${list}. The main view shows the last boundary; the annual table lists every event.`;
    }
    case "sameAsPrevious":
      return ta
        ? "முந்தைய நாளிலும் இதே திதி/பகுதி உள்ளது. ஆண்டு அட்டவணையில் தொடர்ச்சியான கூடுதல் தேதி மறைக்கப்படும்."
        : "The previous day has the same thithi/sector. The annual table hides the consecutive extra date.";
    case "skippedSectors":
      return ta
        ? `முந்தைய நாளிலிருந்து ${reason.step} பகுதிகள் முன்னேறியுள்ளன; இடைப்பட்ட திதி/பகுதிக்கு தனி நாள் கிடைக்கவில்லை.`
        : `Advanced ${reason.step} sectors since the previous day; the thithi/sector in between gets no day of its own.`;
    case "sameAsNext":
      return ta
        ? "அடுத்த நாளிலும் இதே திதி/பகுதி உள்ளது; ஆண்டு அட்டவணையில் தொடக்க நிகழ்வுத் தேதி மட்டும் காட்டப்படும்."
        : "The next day has the same thithi/sector; the annual table shows only the starting event date.";
  }
}
