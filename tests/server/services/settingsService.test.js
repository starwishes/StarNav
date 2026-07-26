import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getDb } from '../../../src/server/services/database/database.js'
import { settingsService } from '../../../src/server/services/system/settingsService.js'
import { logger } from '../../../src/server/utils/logger.js'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'


describe('settingsService', () => {
  let testDataDir

  beforeEach(() => {
    testDataDir = createTestDataDir('starnav-settings-service')
    vi.restoreAllMocks()
    getDb().prepare('DELETE FROM settings').run()
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  it('stores and reads typed values while falling back to defaults', () => {
    expect(settingsService.get('missing', 'fallback')).toBe('fallback')

    expect(settingsService.set('registrationEnabled', true)).toBe(true)
    expect(settingsService.set('siteName', 'StarNav')).toBe(true)
    expect(settingsService.set('theme', { accent: 'blue' })).toBe(true)

    expect(settingsService.get('registrationEnabled')).toBe(true)
    expect(settingsService.get('siteName')).toBe('StarNav')
    expect(settingsService.get('theme')).toEqual({ accent: 'blue' })

    getDb()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run('legacyText', 'plain-text')
    expect(settingsService.get('legacyText')).toBe('plain-text')
  })

  it('returns all settings and exposes only the public subset defaults', () => {
    expect(
      settingsService.updateAll({
        registrationEnabled: true,
        siteName: 'StarNav',
        logoUrl: '/logo.png',
        faviconUrl: '/favicon.ico',
        backgroundUrl: '/bg.jpg',
        footerHtml: '<p>footer</p>',
        homeUrl: 'https://home.test',
        timezone: 'Asia/Shanghai',
        internalToken: 'secret'
      })
    ).toBe(true)

    expect(settingsService.getAll()).toMatchObject({
      registrationEnabled: true,
      siteName: 'StarNav',
      logoUrl: '/logo.png',
      faviconUrl: '/favicon.ico',
      backgroundUrl: '/bg.jpg',
      footerHtml: '<p>footer</p>',
      homeUrl: 'https://home.test',
      timezone: 'Asia/Shanghai',
      internalToken: 'secret'
    })

    expect(settingsService.getPublic()).toEqual({
      registrationEnabled: true,
      backgroundUrl: '/bg.jpg',
      timezone: 'Asia/Shanghai',
      homeUrl: 'https://home.test',
      footerHtml: '<p>footer</p>',
      siteName: 'StarNav',
      logoUrl: '/logo.png',
      faviconUrl: '/favicon.ico'
    })
  })

  it('sanitizes unsafe public-facing settings when reading them back', () => {
    expect(
      settingsService.updateAll({
        footerHtml: '<a href="javascript:alert(1)">bad</a><strong>safe</strong>',
        homeUrl: 'javascript:alert(1)',
        logoUrl: 'data:text/html;base64,abc'
      })
    ).toBe(true)

    expect(settingsService.getPublic()).toEqual({
      registrationEnabled: false,
      backgroundUrl: '',
      timezone: '',
      homeUrl: '',
      footerHtml: 'bad<strong>safe</strong>',
      siteName: '',
      logoUrl: '',
      faviconUrl: ''
    })
  })

  it('returns false and logs when a value cannot be serialized', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const circular = { name: 'bad' }
    circular.self = circular

    expect(settingsService.set('broken', circular)).toBe(false)
    expect(settingsService.updateAll({ broken: circular })).toBe(false)
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })
})
