/**
 * Vitest global setup
 * Configure test environment and mocks
 */

import { vi } from 'vitest'

// Silence real logger output in tests; targeted logger assertions should mock the module explicitly.
process.env.LOG_LEVEL = '0'

// Mock window.matchMedia for component tests
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}
