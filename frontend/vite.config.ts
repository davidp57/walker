import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies /api to the FastAPI backend so the SPA and API share an origin.
// In production the SPA is built to dist/ and served by FastAPI (see ADR-0003).
// Vitest config (the `test` field) lives in the sibling vitest.config.ts to avoid a Vite/Vitest
// `Plugin` type clash between their (differently-versioned) nested `vite` copies.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
  },
})
