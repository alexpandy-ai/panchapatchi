import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { openDatabase, sheetToResponse } from "./db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "pancha-pakshi.db");
const OUT_DIR = process.env.API_OUT_DIR || join(__dirname, "..", "public", "api");

const db = openDatabase(DB_PATH);

mkdirSync(OUT_DIR, { recursive: true });

for (const slug of ["valarpirai", "theipirai"]) {
  const data = sheetToResponse(db, slug);
  if (!data) {
    throw new Error(`Missing sheet data for ${slug}. Run \`npm run seed\` first.`);
  }
  writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(data));
}

console.log("Exported API JSON to", OUT_DIR);
