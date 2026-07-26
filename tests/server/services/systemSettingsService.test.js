import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/services/system/settingsService.js', () => ({
  settingsService: {
    getPublic: vi.fn(),
    getAll: vi.fn(),
    updateAll: vi.fn(),
    set: vi.fn()
  }
}))

const { systemSettingsService } = await import('../../../src/server/services/system/systemSettingsService.js')
const { settingsService } = await import('../../../src/server/services/system/settingsService.js')

describe('SystemSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delegate public settings reads to settingsService', () => {
    settingsService.getPublic.mockReturnValue({ siteName: 'StarNav' })

    expect(systemSettingsService.getPublicSettings()).toEqual({ siteName: 'StarNav' })
    expect(settingsService.getPublic).toHaveBeenCalled()
  })

  it('should persist admin settings updates', () => {
    settingsService.updateAll.mockReturnValue(true)

    expect(
      systemSettingsService.updateAdminSettings({
        siteName: 'StarNav',
        footerHtml: '<strong>Hello</strong><script>alert(1)</script>'
      })
    ).toEqual(undefined)
    expect(settingsService.updateAll).toHaveBeenCalledWith({
      siteName: 'StarNav',
      footerHtml: '<strong>Hello</strong>'
    })
  })

  it('strips legacy theme fields from admin settings output and payloads', () => {
    settingsService.getAll.mockReturnValue({
      siteName: 'StarNav',
      themePreset: 'gallery',
      themeColor: '#0071e3'
    })
    settingsService.updateAll.mockReturnValue(true)

    expect(systemSettingsService.getAdminSettings()).toEqual({
      siteName: 'StarNav'
    })

    expect(
      systemSettingsService.updateAdminSettings({
        siteName: 'StarNav',
        themePreset: 'gallery',
        themeColor: '#0071E3'
      })
    ).toEqual(undefined)
    expect(settingsService.updateAll).toHaveBeenCalledWith({
      siteName: 'StarNav'
    })
  })

  it('should reject invalid admin settings payloads', () => {
    expect(() => {
      systemSettingsService.updateAdminSettings({
        footerHtml: '<a href="javascript:alert(1)">bad</a>',
        unknownKey: true
      })
    }).toThrow('设置参数不正确')
  })

  it('should reject failed background updates', () => {
    settingsService.set.mockReturnValue(false)

    expect(() => {
      systemSettingsService.setBackground('/uploads/bg.png')
    }).toThrow('保存失败')
  })

  it('should reject invalid background urls', () => {
    expect(() => {
      systemSettingsService.setBackground('javascript:alert(1)')
    }).toThrow('背景图地址不正确')
  })
})
