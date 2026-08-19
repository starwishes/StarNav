import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn()
}))

vi.mock('@/api', () => ({
  publicApi: {
    getSettings: mocks.getSettings
  }
}))

import { useConfigStore } from '@/store/config'

const doc = globalThis.document

const getFaviconHref = () => doc.querySelector("link[rel~='icon']")?.getAttribute('href') || null

describe('config store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    doc.head.innerHTML = ''
    doc.body.innerHTML = ''
    doc.body.style.cssText = ''
    doc.documentElement.style.cssText = ''
    doc.title = ''
    mocks.getSettings.mockReset()
    vi.restoreAllMocks()
  })

  it('hydrates config from localStorage and applies it to the document', () => {
    localStorage.setItem(
      'siteConfig',
      JSON.stringify({
        siteName: 'Stored StarNav',
        faviconUrl: '/stored.ico',
        backgroundUrl: '/stored-bg.jpg',
        homeUrl: '/stored-home'
      })
    )

    const store = useConfigStore()

    expect(store.siteConfig.siteName).toBe('Stored StarNav')
    expect(store.siteConfig.homeUrl).toBe('/stored-home')
    expect(store.displaySiteName).toBe('Stored StarNav')
    expect(doc.title).toBe('Stored StarNav')
    expect(getFaviconHref()).toBe('/stored.ico')
    expect(doc.documentElement.style.getPropertyValue('--ui-theme')).toBe('#409eff')
    expect(doc.documentElement.style.getPropertyValue('--bg-image')).toBe("url('/stored-bg.jpg')")
    expect(doc.body.style.backgroundImage).toContain('/stored-bg.jpg')
  })

  it('falls back to defaults when persisted config is invalid json', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('siteConfig', '{bad json')

    const store = useConfigStore()

    expect(errorSpy).toHaveBeenCalled()
    expect(store.siteConfig.siteName).toBe('')
    expect(store.siteConfig.registrationEnabled).toBe(false)
    expect(store.displaySiteName).toBe('星语导航')
    expect(doc.title).toBe('星语导航')
    expect(getFaviconHref()).toBe('/favicon.svg?v=2')
  })

  it('persists updates and applies title, favicon, and background changes', () => {
    const store = useConfigStore()

    store.updateConfig({
      siteName: 'Updated StarNav',
      faviconUrl: '/brand.ico',
      backgroundUrl: '/brand-bg.jpg',
      footerHtml: '<strong>Footer</strong><script>alert(1)</script>'
    })

    expect(store.loaded).toBe(true)
    expect(JSON.parse(localStorage.getItem('siteConfig'))).toMatchObject({
      siteName: 'Updated StarNav',
      faviconUrl: '/brand.ico',
      backgroundUrl: '/brand-bg.jpg',
      footerHtml: '<strong>Footer</strong>'
    })
    expect(JSON.parse(localStorage.getItem('siteConfig'))).not.toHaveProperty('themePreset')
    expect(JSON.parse(localStorage.getItem('siteConfig'))).not.toHaveProperty('themeColor')
    expect(doc.title).toBe('Updated StarNav')
    expect(getFaviconHref()).toBe('/brand.ico')
    expect(doc.documentElement.style.getPropertyValue('--ui-theme')).toBe('#409eff')
    expect(doc.documentElement.style.getPropertyValue('--bg-image')).toBe("url('/brand-bg.jpg')")
    expect(doc.body.style.backgroundAttachment).toBe('fixed')

    store.updateConfig({ backgroundUrl: '' })
    expect(doc.documentElement.style.getPropertyValue('--bg-image')).toBe('')
    expect(doc.body.style.backgroundImage).toBe('')
  })

  it('sanitizes unsafe persisted public settings before applying them', () => {
    localStorage.setItem(
      'siteConfig',
      JSON.stringify({
        siteName: 'Stored StarNav',
        faviconUrl: 'javascript:alert(1)',
        backgroundUrl: 'data:text/html;base64,evil',
        homeUrl: 'javascript:alert(1)',
        footerHtml: '<a href="javascript:alert(1)">bad</a><strong>safe</strong>'
      })
    )

    const store = useConfigStore()

    expect(store.siteConfig.faviconUrl).toBe('')
    expect(store.siteConfig.backgroundUrl).toBe('')
    expect(store.siteConfig.homeUrl).toBe('')
    expect(store.siteConfig.footerHtml).toBe('bad<strong>safe</strong>')
    expect(getFaviconHref()).toBe('/favicon.svg?v=2')
    expect(doc.body.style.backgroundImage).toBe('')
  })

  it('neutralizes background urls containing css-breaking characters', () => {
    localStorage.setItem(
      'siteConfig',
      JSON.stringify({
        siteName: 'Stored StarNav',
        backgroundUrl: "https://evil.test/bg.jpg');background:red;"
      })
    )

    const store = useConfigStore()

    expect(store.siteConfig.backgroundUrl).toBe('')
    expect(doc.body.style.backgroundImage).toBe('')
    expect(doc.documentElement.style.getPropertyValue('--bg-image')).toBe('')
  })

  it('deduplicates in-flight ensureLoaded callers and resolves both from one request', async () => {
    let resolveRequest
    mocks.getSettings.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        })
    )

    const store = useConfigStore()
    const firstRequest = store.ensureLoaded()
    const secondRequest = store.ensureLoaded()

    expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    expect(store.loading).toBe(true)

    resolveRequest({
      siteName: 'Deduped'
    })

    const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest])

    expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    expect(firstResult).toEqual(secondResult)
    expect(store.siteConfig.siteName).toBe('Deduped')
    expect(store.loading).toBe(false)
  })

  it('short-circuits ensureLoaded when already loaded and bypasses the cache when forced', async () => {
    const store = useConfigStore()
    store.updateConfig({
      siteName: 'Local Only'
    })

    await expect(store.ensureLoaded()).resolves.toMatchObject({
      siteName: 'Local Only'
    })
    expect(mocks.getSettings).not.toHaveBeenCalled()

    mocks.getSettings.mockResolvedValue({
      siteName: 'Forced Remote'
    })

    await store.fetchConfig({ force: true })

    expect(mocks.getSettings).toHaveBeenCalledTimes(1)
    expect(store.siteConfig.siteName).toBe('Forced Remote')
  })

  it('resets loading and reapplies the current config when fetch fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem(
      'siteConfig',
      JSON.stringify({
        siteName: 'Stored StarNav',
        faviconUrl: '/stored.ico',
        backgroundUrl: '/stored-bg.jpg'
      })
    )
    mocks.getSettings.mockRejectedValue(new Error('settings failed'))

    const store = useConfigStore()
    doc.title = 'Mutated'
    doc.documentElement.style.setProperty('--bg-image', "url('/mutated.jpg')")
    doc.body.style.backgroundImage = "url('/mutated.jpg')"

    await expect(store.fetchConfig()).rejects.toThrow('settings failed')

    expect(errorSpy).toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.loaded).toBe(false)
    expect(doc.title).toBe('Stored StarNav')
    expect(getFaviconHref()).toBe('/stored.ico')
    expect(doc.documentElement.style.getPropertyValue('--bg-image')).toBe("url('/stored-bg.jpg')")
    expect(doc.body.style.backgroundImage).toContain('/stored-bg.jpg')
  })
})
