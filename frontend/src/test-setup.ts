import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Testing Library's auto-cleanup relies on a global `afterEach`, which this project doesn't enable
// (no `test.globals` in vitest.config.ts) — register it explicitly so each test starts with a fresh DOM.
afterEach(() => {
  cleanup()
})
