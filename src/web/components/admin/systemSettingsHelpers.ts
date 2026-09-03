import type { SystemSettings as SystemSettingsModel } from '@/api'

type Translate = (key: string) => string

export const createSystemSettingsDraft = (initialSettings: Partial<SystemSettingsModel>) => ({
  ...initialSettings
})

export const syncSystemSettingsDraft = (
  target: Partial<SystemSettingsModel>,
  nextSettings: Partial<SystemSettingsModel>
) => {
  Object.assign(target, nextSettings)
  return target
}

export const buildDefaultLevelOptions = (t: Translate) => [
  { label: `${t('userLevel.user')} (1)`, value: 1 },
  { label: `${t('userLevel.vip')} (2)`, value: 2 }
]

// 时区下拉选项。校验侧的单一事实源是 src/shared/security/urlSafety.ts SUPPORTED_TIMEZONES
//（isAllowedTimezone 白名单）——此处 value 集合必须与之逐项一致（额外需 i18n label），
// 改动任一侧都要同步另一侧，避免"选项能选但保存被拒"或"白名单放行但 UI 选不到"。
export const buildTimezoneOptions = (t: Translate) => [
  { label: t('timezone.local'), value: '' },
  { label: t('timezone.shanghai'), value: 'Asia/Shanghai' },
  { label: t('timezone.tokyo'), value: 'Asia/Tokyo' },
  { label: t('timezone.london'), value: 'Europe/London' },
  { label: t('timezone.newYork'), value: 'America/New_York' },
  { label: t('timezone.losAngeles'), value: 'America/Los_Angeles' },
  { label: t('timezone.moscow'), value: 'Europe/Moscow' },
  { label: t('timezone.paris'), value: 'Europe/Paris' },
  { label: t('timezone.sydney'), value: 'Australia/Sydney' }
]

export const buildDefaultFooterHtml = (
  siteName: string | undefined,
  fallbackSiteName: string,
  year = new Date().getFullYear()
) => {
  const finalSiteName = siteName || fallbackSiteName
  return `&copy; ${year} <a href="https://github.com/starwishes/Nav" target="_blank">${finalSiteName}</a>. All Rights Reserved.`
}
