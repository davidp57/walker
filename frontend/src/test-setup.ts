import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Unmount components rendered by each test (no explicit `globals: true` in vitest.config.ts, so
// Testing Library's automatic cleanup isn't wired in without this).
afterEach(() => {
  cleanup()
})
