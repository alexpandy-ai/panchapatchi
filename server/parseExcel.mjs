import { formatPatchiName } from "./patchiSymbols.mjs";

const YAMA_FRACTIONS = [
  0.24930555555555556,
  0.3493055556,
  0.4493055556,
  0.5493055556,
  0.6493055556,
];
const YAMA_LABELS = ["ஜாமம் 1", "ஜாமம் 2", "ஜாமம் 3", "ஜாமம் 4", "ஜாமம் 5"];

function trimCell(val) {
  return String(val ?? "").trim();
}

const ACTIVITY_ALIASES = {
  ஊ: "ஊண்",
  சா: "சாவு",
  து: "துயில்",
  அ: "அரசு",
  ந: "நடை",
};

function normalizeActivity(label) {
  const trimmed = trimCell(label);
  return ACTIVITY_ALIASES[trimmed] ?? trimmed;
}

function parseActivityHeaders(row) {
  const day = [];
  const night = [];
  for (let col = 2; col <= 6; col++) day.push(normalizeActivity(row[col]));
  for (let col = 7; col <= 11; col++) night.push(normalizeActivity(row[col]));
  return { day, night };
}

function parseSlots(row, startCol, activities) {
  return activities.map((activity, idx) => ({
    activity,
    bird: formatPatchiName(trimCell(row[startCol + idx])),
  }));
}

export function parsePakshaSheet(rows, sheetName) {
  const headerRow = rows[0] ?? [];
  const activityHeaderRow = rows[1] ?? [];
  const { day: dayActivities, night: nightActivities } = parseActivityHeaders(activityHeaderRow);

  const daySectionLabel = trimCell(headerRow[3]) || "பகல்";
  const nightSectionLabel = trimCell(headerRow[10]) || "இரவு";

  const groups = [];
  let currentGroup = null;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const groupKey = trimCell(row[0]);
    if (groupKey) {
      currentGroup = { key: groupKey, yamas: [] };
      groups.push(currentGroup);
    }

    const fraction = typeof row[1] === "number" ? row[1] : null;
    if (!fraction || !currentGroup) continue;

    const yamaIndex = YAMA_FRACTIONS.findIndex((f) => Math.abs(f - fraction) < 0.0001);
    if (yamaIndex < 0) continue;

    currentGroup.yamas.push({
      yama: yamaIndex + 1,
      yamaLabel: YAMA_LABELS[yamaIndex],
      fraction,
      day: parseSlots(row, 2, dayActivities),
      night: parseSlots(row, 7, nightActivities),
    });
  }

  return {
    sheetName,
    daySectionLabel,
    nightSectionLabel,
    dayActivities,
    nightActivities,
    groups,
  };
}

export function slugForSheetName(name) {
  if (name === "வளர்பிறை") return "valarpirai";
  if (name === "தேய்பிறை") return "theipirai";
  return name.toLowerCase().replace(/\s+/g, "-");
}
