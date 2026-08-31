import cors from "cors";
import express from "express";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { openDatabase, sheetToResponse } from "./db.mjs";
import { seedDatabase } from "./seed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const DIST_DIR = join(ROOT_DIR, "dist");
const DB_PATH = process.env.DB_PATH || join(__dirname, "pancha-pakshi.db");
const PORT = Number(process.env.PORT || 3001);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

try {
  const seedResult = seedDatabase({ dbPath: DB_PATH });
  if (seedResult.seeded) {
    console.log("Database seeded from Excel:", seedResult.sheets);
  } else {
    console.log("Database already seeded — use `npm run seed -- --force` to reimport");
  }
} catch (error) {
  console.error("Seed failed:", error.message);
  console.error("Start the server anyway; run `npm run seed` after fixing the Excel path.");
}

const db = openDatabase(DB_PATH);
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/sheets", (_req, res) => {
  const sheets = db
    .prepare("SELECT slug, name FROM sheets ORDER BY id")
    .all()
    .map((sheet) => ({
      slug: sheet.slug,
      name: sheet.name,
      url: `/api/${sheet.slug}`,
    }));
  res.json(sheets);
});

app.get("/api/valarpirai", (_req, res) => {
  const data = sheetToResponse(db, "valarpirai");
  if (!data) {
    res.status(404).json({ error: "வளர்பிறை data not found" });
    return;
  }
  res.json(data);
});

app.get("/api/theipirai", (_req, res) => {
  const data = sheetToResponse(db, "theipirai");
  if (!data) {
    res.status(404).json({ error: "தேய்பிறை data not found" });
    return;
  }
  res.json(data);
});

for (const slug of ["valarpirai", "theipirai"]) {
  app.get(`/api/${slug}.json`, (_req, res) => {
    const data = sheetToResponse(db, slug);
    if (!data) {
      res.status(404).json({ error: `${slug} data not found` });
      return;
    }
    res.json(data);
  });
}

if (IS_PRODUCTION && existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => {
    res.sendFile(join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  const mode = IS_PRODUCTION && existsSync(DIST_DIR) ? "app" : "API";
  console.log(`${mode} running at http://localhost:${PORT}`);
});
