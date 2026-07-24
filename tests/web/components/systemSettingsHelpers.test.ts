import { describe, expect, it } from 'vitest'

import {
  buildDefaultFooterHtml,
  buildDefaultLevelOptions,
  buildThemePresetOptions,
  buildTimezoneOptions,
  createSystemSettingsDraft,
  syncSystemSettingsDraft
} from '@/components/admin/systemSettingsHelpers'

const t = (key: string) => `translated:${key}`

describe('systemSettingsHelpers', () => {
  it('creates and synchronizes settings drafts', () => {
    const draft = createSystemSettingsDraft({
      siteName: 'StarNav',
      registrationEnabled: true
    })

    expect(draft).toEqual({
      siteName: 'StarNav',
      registrationEnabled: true,
      themePreset: 'classic',
      themeColor: ''
    })

    expect(
      syncSystemSettingsDraft(draft, {
        siteName: 'New Name',
        timezone: 'Asia/Shanghai',
        themePreset: 'gallery',
        themeColor: '#0071E3'
      })
    ).toEqual({
      siteName: 'New Name',
      registrationEnabled: true,
      timezone: 'Asia/Shanghai',
      themePreset: 'gallery',
      themeColor: '#0071e3'
    })
  })

  it('builds select options from the translator', () => {
    expect(buildDefaultLevelOptions(t)).toEqual([
      { label: 'translated:userLevel.user (1)', value: 1 },
      { label: 'translated:userLevel.vip (2)', value: 2 }
    ])

    expect(buildTimezoneOptions(t)).toEqual([
      { label: 'translated:timezone.local', value: '' },
      { label: 'translated:timezone.shanghai', value: 'Asia/Shanghai' },
      { label: 'translated:timezone.tokyo', value: 'Asia/Tokyo' },
      { label: 'translated:timezone.london', value: 'Europe/London' },
      { label: 'translated:timezone.newYork', value: 'America/New_York' },
      { label: 'translated:timezone.losAngeles', value: 'America/Los_Angeles' },
      { label: 'translated:timezone.moscow', value: 'Europe/Moscow' },
      { label: 'translated:timezone.paris', value: 'Europe/Paris' },
      { label: 'translated:timezone.sydney', value: 'Australia/Sydney' }
    ])

    expect(buildThemePresetOptions(t)).toEqual([
      { label: 'translated:settings.themePresetClassic', value: 'classic' },
      { label: 'translated:settings.themePresetGallery', value: 'gallery' },
      { label: 'translated:settings.themePresetCinema', value: 'cinema' }
    ])
  })

  it('builds the default footer html with explicit and fallback site names', () => {
    expect(buildDefaultFooterHtml('StarNav', 'Fallback', 2026)).toBe(
      '&copy; 2026 <a href="https://github.com/starwishes/Nav" target="_blank">StarNav</a>. All Rights Reserved.'
    )

    expect(buildDefaultFooterHtml('', 'Fallback', 2026)).toBe(
      '&copy; 2026 <a href="https://github.com/starwishes/Nav" target="_blank">Fallback</a>. All Rights Reserved.'
    )
  })
})
