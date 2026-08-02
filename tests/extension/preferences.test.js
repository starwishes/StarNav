/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'

import {
  applyDocumentLanguage,
  applyThemeMode,
  resolveExtensionLanguage,
  resolveExtensionThemeMode
} from '../../clients/extension/utils/preferences.js'

describe('browser extension preferences helpers', () => {
  it('prefers injected or stored language values and normalizes them', () => {
    expect(resolveExtensionLanguage({ lang: 'zh' })).toBe('zh')
    expect(resolveExtensionLanguage({ locale: 'en-US' })).toBe('en')
    expect(resolveExtensionLanguage({}, { navigator: { language: 'zh-CN' } })).toBe('zh')
  })

  it('resolves theme mode from explicit values before falling back to system preference', () => {
    expect(resolveExtensionThemeMode({ themeMode: 'dark' })).toBe('dark')

    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(resolveExtensionThemeMode({}, { matchMedia })).toBe('dark')
  })

  it('applies document language and theme mode attributes', () => {
    const { document } = globalThis

    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('theme-mode')
    document.documentElement.classList.remove('dark')

    applyDocumentLanguage('zh')
    applyThemeMode('dark')

    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
    expect(document.documentElement.getAttribute('theme-mode')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
