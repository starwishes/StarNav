import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import zhCN from '../../../src/web/locales/zh-CN.json'
import enUS from '../../../src/web/locales/en-US.json'

const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      return flattenKeys(value as Record<string, unknown>, fullKey)
    }
    return [fullKey]
  })

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

  it('restores document.documentElement.lang from the saved locale on init', async () => {
    localStorage.setItem('locale', 'en-US')
    const enModule = await loadI18nModule()
    expect(enModule.getLocale()).toBe('en-US')
    expect(document.documentElement.getAttribute('lang')).toBe('en')

    localStorage.setItem('locale', 'zh-CN')
    const zhModule = await loadI18nModule()
    expect(zhModule.getLocale()).toBe('zh-CN')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
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

  it('invokes the registered title refresh handler on every locale switch', async () => {
    const i18nModule = await loadI18nModule()
    const handler = vi.fn()

    // 未注册前 setLocale 不应抛错（?.() 可空调用）
    expect(() => i18nModule.setLocale('en-US')).not.toThrow()

    i18nModule.registerTitleRefreshHandler(handler)
    i18nModule.setLocale('en-US')
    expect(handler).toHaveBeenCalledTimes(1)
    i18nModule.setLocale('zh-CN')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('includes health translations for the english admin dashboard', async () => {
    localStorage.setItem('locale', 'en-US')
    const i18nModule = await loadI18nModule()

    expect(i18nModule.default.global.t('health.title')).toBe('System Monitor')
    expect(i18nModule.default.global.t('health.refresh')).toBe('Refresh Metrics')
    expect(i18nModule.default.global.t('health.uptimeHourUnit')).toBe('h')
  })

  it('keeps en-US and zh-CN key sets in parity (en ⊆ zh and zh ⊆ en)', async () => {
    const zhKeys = flattenKeys(zhCN)
    const enKeys = flattenKeys(enUS)
    const zhSet = new Set(zhKeys)
    const enSet = new Set(enKeys)

    const enMissingInZh = enKeys.filter((key) => !zhSet.has(key))
    const zhMissingInEn = zhKeys.filter((key) => !enSet.has(key))

    expect(enMissingInZh).toEqual([])
    expect(zhMissingInEn).toEqual([])
  })
})
