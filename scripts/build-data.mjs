import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { formatPatchiName } from "../server/patchiSymbols.mjs";

const excelPath = "c:\\Users\\radhi\\Downloads\\Copy of பஞ்சபட்சி.xlsx";
const wb = XLSX.readFile(excelPath);

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

function parseSlots(row, activities) {
  return activities.map((activity, idx) => ({
    activity,
    bird: formatPatchiName(trimCell(row[2 + idx])),
  }));
}

function normalizeSlotActivities(slots) {
  return slots.map((slot) => ({
    ...slot,
    activity: normalizeActivity(slot.activity),
  }));
}

function parseNightSlots(row, activities) {
  return activities.map((activity, idx) => ({
    activity,
    bird: formatPatchiName(trimCell(row[7 + idx])),
  }));
}

function parsePakshaSheet(rows, sheetName) {
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
      day: normalizeSlotActivities(parseSlots(row, dayActivities)),
      night: normalizeSlotActivities(parseNightSlots(row, nightActivities)),
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

mkdirSync("src/data", { recursive: true });

const valarpirai = parsePakshaSheet(
  XLSX.utils.sheet_to_json(wb.Sheets["வளர்பிறை"], { header: 1, defval: "" }),
  "வளர்பிறை",
);
const theipirai = parsePakshaSheet(
  XLSX.utils.sheet_to_json(wb.Sheets["தேய்பிறை"], { header: 1, defval: "" }),
  "தேய்பிறை",
);

const output = {
  meta: { source: "Copy of பஞ்சபட்சி.xlsx", sheets: wb.SheetNames },
  valarpirai,
  theipirai,
};

writeFileSync("src/data/pancha-pakshi.json", JSON.stringify(output, null, 2));
console.log(
  JSON.stringify(
    {
      valarpiraiGroups: valarpirai.groups.length,
      valarpiraiYamas: valarpirai.groups.reduce((n, g) => n + g.yamas.length, 0),
      theipiraiGroups: theipirai.groups.length,
      theipiraiYamas: theipirai.groups.reduce((n, g) => n + g.yamas.length, 0),
    },
    null,
    2,
  ),
);
