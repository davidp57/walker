import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library doesn't auto-detect Vitest's test runner; unmount after each test so
// component tests (EntryRow, App) don't leak DOM nodes across `it` blocks.
afterEach(() => {
  cleanup()
})
