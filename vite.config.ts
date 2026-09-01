import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Serve schedule JSON from public/api/ (exported by `npm run export-api`).
    // The Express API on :3001 is optional in dev; use `npm run dev:server` only
    // when you need live DB-backed endpoints without re-exporting.
  },
})
