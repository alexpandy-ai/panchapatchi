import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { formatPatchiName } from "./patchiSymbols.mjs";

function withPatchiSymbols(slots) {
  return slots.map((slot) => ({
    ...slot,
    bird: formatPatchiName(slot.bird),
  }));
}

export function openDatabase(dbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sheets (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      day_section_label TEXT NOT NULL,
      night_section_label TEXT NOT NULL,
      day_activities TEXT NOT NULL,
      night_activities TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jamam_rows (
      id INTEGER PRIMARY KEY,
      sheet_id INTEGER NOT NULL,
      group_key TEXT NOT NULL,
      yama_number INTEGER NOT NULL,
      yama_label TEXT NOT NULL,
      fraction REAL NOT NULL,
      day_slots TEXT NOT NULL,
      night_slots TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (sheet_id) REFERENCES sheets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_jamam_rows_sheet ON jamam_rows(sheet_id);
    CREATE INDEX IF NOT EXISTS idx_jamam_rows_sort ON jamam_rows(sheet_id, sort_order);
  `);

  return db;
}

export function sheetToResponse(db, slug) {
  const sheet = db
    .prepare(
      `SELECT id, slug, name, day_section_label, night_section_label, day_activities, night_activities
       FROM sheets WHERE slug = ?`,
    )
    .get(slug);

  if (!sheet) return null;

  const rows = db
    .prepare(
      `SELECT group_key, yama_number, yama_label, fraction, day_slots, night_slots
       FROM jamam_rows
       WHERE sheet_id = ?
       ORDER BY sort_order`,
    )
    .all(sheet.id);

  const groups = [];
  let currentGroup = null;

  for (const row of rows) {
    if (!currentGroup || currentGroup.key !== row.group_key) {
      currentGroup = { key: row.group_key, yamas: [] };
      groups.push(currentGroup);
    }

    currentGroup.yamas.push({
      yama: row.yama_number,
      yamaLabel: row.yama_label,
      fraction: row.fraction,
      day: withPatchiSymbols(JSON.parse(row.day_slots)),
      night: withPatchiSymbols(JSON.parse(row.night_slots)),
    });
  }

  return {
    sheetName: sheet.name,
    daySectionLabel: sheet.day_section_label,
    nightSectionLabel: sheet.night_section_label,
    dayActivities: JSON.parse(sheet.day_activities),
    nightActivities: JSON.parse(sheet.night_activities),
    groups,
  };
}
