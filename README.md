# பஞ்ச பட்சி (Pancha Pakshi)

Simple stack: **SQLite backend** (Node.js built-in `node:sqlite`) + **React table frontend** showing Excel data as-is.

## Project structure

```
pancha-patchi/
├── server/
│   ├── index.mjs        # Express API (port 3001)
│   ├── db.mjs           # SQLite schema + queries
│   ├── seed.mjs         # Import Excel → database
│   ├── parseExcel.mjs   # Excel parsing logic
│   └── pancha-pakshi.db # SQLite file (created on first run)
├── src/
│   ├── App.tsx          # Tabs + editable date/time + tables
│   ├── components/
│   │   ├── DateTimeCard.tsx  # Editable date & time display
│   │   └── SheetTable.tsx
│   └── types.ts
└── vite.config.ts       # Proxies /api → backend
```

## Database tables

| Table | Purpose |
|-------|---------|
| `sheets` | One row per Excel sheet (வளர்பிறை, தேய்பிறை) — labels and activity column headers |
| `jamam_rows` | One row per jamam — group key, yama number/label, fraction, day/night bird slots (JSON) |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sheets` | List available sheets |
| GET | `/api/valarpirai` | Full வளர்பிறை table data |
| GET | `/api/theipirai` | Full தேய்பிறை table data |

## Run locally

**Prerequisite:** Excel file at  
`c:\Users\radhi\Downloads\Copy of பஞ்சபட்சி.xlsx`  
(or set `EXCEL_PATH` env var)

**Terminal 1 — backend:**
```powershell
cd D:\alex\apps\pancha-patchi
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev:server
```

**Terminal 2 — frontend:**
```powershell
cd D:\alex\apps\pancha-patchi
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Open http://localhost:5173 — editable date/time at top, tabs switch between வளர்பிறை and தேய்பிறை tables.

### Editable date/time UI

Above the tables, a card shows:
- **Large time** (Tamil locale, e.g. `08:30:45 AM`)
- **Date line** (Tamil weekday + full date)
- **தேதி** — native date picker input
- **நேரம்** — native time picker input
- **இப்போது** — reset to current local date/time

Defaults to the current local date/time on load. Changing either input updates the display immediately. The selected datetime is held in app state for future time-aware table logic.

### Re-import Excel data

```powershell
& "C:\Program Files\nodejs\npm.cmd" run seed -- --force
```

## Deployment note

Harvis static hosting serves only the built frontend (`dist/`). It **cannot** run the Express/SQLite backend.

**Options:**
1. **Run locally** — use the two-terminal setup above (recommended for now).
2. **Single-server deploy** — build frontend (`npm run build`), serve `dist/` from Express on one host (e.g. Railway, Render, Fly.io).
3. **Keep static-only** — revert to JSON-in-frontend (previous approach); not needed if you run locally.

## What was removed

Time-based logic, jamam calculations, paksha auto-detection, countdowns, lunar phase, weekday mapping, and the "இப்போது" live view.
