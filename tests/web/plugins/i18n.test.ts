import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadI18nModule = async () => {
  vi.resetModules()
  return import('../../../src/web/plugins/i18n.ts')
}

describe('i18n plugin', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the saved locale from localStorage and falls back to zh-CN', async () => {
    localStorage.setItem('locale', 'en-US')
    const savedModule = await loadI18nModule()
    expect(savedModule.getLocale()).toBe('en-US')

    localStorage.clear()
    const defaultModule = await loadI18nModule()
    expect(defaultModule.getLocale()).toBe('zh-CN')
  })

  it('persists locale changes and updates the document lang attribute', async () => {
    const i18nModule = await loadI18nModule()

    i18nModule.setLocale('en-US')
    expect(i18nModule.getLocale()).toBe('en-US')
    expect(localStorage.getItem('locale')).toBe('en-US')
    expect(document.documentElement.getAttribute('lang')).toBe('en')

    i18nModule.setLocale('zh-CN')
    expect(i18nModule.getLocale()).toBe('zh-CN')
    expect(localStorage.getItem('locale')).toBe('zh-CN')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
  })

  it('includes health translations for the english admin dashboard', async () => {
    localStorage.setItem('locale', 'en-US')
    const i18nModule = await loadI18nModule()

    expect(i18nModule.default.global.t('menu.health')).toBe('System Health')
    expect(i18nModule.default.global.t('health.title')).toBe('System Monitor')
    expect(i18nModule.default.global.t('health.refresh')).toBe('Refresh Metrics')
    expect(i18nModule.default.global.t('health.uptimeHourUnit')).toBe('h')
  })
})
