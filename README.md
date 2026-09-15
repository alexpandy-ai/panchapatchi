# பஞ்ச பட்சி (Pancha Pakshi)

Static **React + Vite** app. Schedule tables live in TypeScript (`src/data/patchiScheduleData.ts`) — **no backend or database** required.

## Project structure

```
panchapatchi/
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── data/patchiScheduleData.ts   # Patchi Schedule tables (in-code)
│   └── utils/
├── scripts/                         # Optional one-off Excel helpers
├── public/
└── vite.config.ts
```

## Run locally

```powershell
cd D:\alex\apps\panchapatchi
npm install
npm run dev
```

Open http://localhost:5173

## Build / preview

```powershell
npm run build
npm run preview
```

## Deploy

Harvis (and similar static hosts) serve the Vite `dist/` output only:

```powershell
npm run build
npx harvis deploy dist
```

## Notes

- Patchi Schedule, Status, and Day Scheduler all read `PATCHI_SCHEDULE_DATA` from source — no API calls.
- `scripts/build-data.mjs` can regenerate table data from Excel if you ever need to refresh the TypeScript dump (`xlsx` is a devDependency for that only).
