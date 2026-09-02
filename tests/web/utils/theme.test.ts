import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStoredThemeMode } from '@/utils/theme'

describe('theme mode resolution', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    localStorage.clear()
  })

  it('returns the stored mode when explicitly saved', () => {
    localStorage.setItem('theme-mode', 'dark')
    expect(getStoredThemeMode()).toBe('dark')

    localStorage.setItem('theme-mode', 'light')
    expect(getStoredThemeMode()).toBe('light')
  })

  it('falls back to the system preference on first visit without a stored value', () => {
    expect(localStorage.getItem('theme-mode')).toBeNull()

    const darkQuery = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    window.matchMedia = darkQuery
    expect(getStoredThemeMode()).toBe('dark')

    const lightQuery = vi.fn().mockReturnValue({
      matches: false
    }) as unknown as typeof window.matchMedia
    window.matchMedia = lightQuery
    expect(getStoredThemeMode()).toBe('light')
  })

  it('defaults to light when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    expect(getStoredThemeMode()).toBe('light')
  })
})
