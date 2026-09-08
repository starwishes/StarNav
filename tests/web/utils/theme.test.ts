import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyThemeMode, getStoredThemeMode } from '@/utils/theme'

describe('theme mode resolution', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    localStorage.clear()
    vi.restoreAllMocks()
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

  it('degrades gracefully when localStorage access is blocked (round 34 L5)', () => {
    // 禁用站点数据/隐私模式下 localStorage 读/写抛 SecurityError；
    // 主题读应回退默认、写应静默，而不是把异常抛给启动链路
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })

    const darkQuery = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    window.matchMedia = darkQuery

    expect(getStoredThemeMode()).toBe('dark')

    expect(applyThemeMode('light')).toBe('light')
    expect(document.documentElement.getAttribute('theme-mode')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
