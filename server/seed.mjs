import XLSX from "xlsx";
import { existsSync } from "fs";
import { openDatabase } from "./db.mjs";
import { parsePakshaSheet, slugForSheetName } from "./parseExcel.mjs";

const DEFAULT_EXCEL_PATH = "c:\\Users\\radhi\\Downloads\\Copy of பஞ்சபட்சி.xlsx";
const DEFAULT_DB_PATH = "server/pancha-pakshi.db";

function importSheet(db, wb, sheetName) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
  const parsed = parsePakshaSheet(rows, sheetName);
  const slug = slugForSheetName(sheetName);

  db.prepare("DELETE FROM jamam_rows WHERE sheet_id IN (SELECT id FROM sheets WHERE slug = ?)").run(
    slug,
  );
  db.prepare("DELETE FROM sheets WHERE slug = ?").run(slug);

  const insertSheet = db.prepare(
    `INSERT INTO sheets (slug, name, day_section_label, night_section_label, day_activities, night_activities)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  insertSheet.run(
    slug,
    parsed.sheetName,
    parsed.daySectionLabel,
    parsed.nightSectionLabel,
    JSON.stringify(parsed.dayActivities),
    JSON.stringify(parsed.nightActivities),
  );

  const sheetId = db.prepare("SELECT last_insert_rowid() AS id").get().id;
  const insertRow = db.prepare(
    `INSERT INTO jamam_rows
      (sheet_id, group_key, yama_number, yama_label, fraction, day_slots, night_slots, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let sortOrder = 0;
  for (const group of parsed.groups) {
    for (const yama of group.yamas) {
      insertRow.run(
        sheetId,
        group.key,
        yama.yama,
        yama.yamaLabel,
        yama.fraction,
        JSON.stringify(yama.day),
        JSON.stringify(yama.night),
        sortOrder++,
      );
    }
  }

  return {
    slug,
    groups: parsed.groups.length,
    rows: sortOrder,
  };
}

export function seedDatabase({
  excelPath = process.env.EXCEL_PATH || DEFAULT_EXCEL_PATH,
  dbPath = process.env.DB_PATH || DEFAULT_DB_PATH,
  force = false,
} = {}) {
  if (!existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const db = openDatabase(dbPath);
  const sheetCount = db.prepare("SELECT COUNT(*) AS count FROM sheets").get().count;

  if (sheetCount > 0 && !force) {
    return { seeded: false, reason: "already_seeded" };
  }

  const wb = XLSX.readFile(excelPath);

  db.exec("BEGIN IMMEDIATE");
  try {
    const results = wb.SheetNames.map((name) => importSheet(db, wb, name));
    db.exec("COMMIT");
    return { seeded: true, sheets: results };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

import { pathToFileURL } from "url";

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const force = process.argv.includes("--force");
  try {
    const result = seedDatabase({ force });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
