import { defineConfig } from 'vitest/config'

// Vitest merges this with vite.config.ts (plugins, resolve, ...); only the `test` field lives here.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
