import { settingsService } from './settingsService.js'
import { errors } from '../../middleware/errorHandler.js'
import { adminSettingsSchema, backgroundUrlSchema } from '../../middleware/validation.js'
import { sanitizeFooterHtml } from '../../../shared/security/footerHtml.js'
import { isAllowedTimezone, normalizeOptionalUrl } from '../../../shared/security/urlSafety.js'
import { normalizeThemeColor, normalizeThemePreset } from '../../../shared/theme.js'
import type { SettingsMap } from '../../types/domain.js'

const validatePayload = (schema: { validate: (payload: unknown, options?: object) => { error?: unknown; value: unknown } }, payload: unknown, message: string) => {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    convert: true,
    stripUnknown: true
  })

  if (error) {
    throw errors.badRequest(message)
  }

  return value
}

const sanitizeSettingsForOutput = (settings: SettingsMap = {}) => ({
  ...settings,
  backgroundUrl:
    settings.backgroundUrl === undefined
      ? settings.backgroundUrl
      : normalizeOptionalUrl(settings.backgroundUrl, { allowRelative: true }),
  footerHtml:
    settings.footerHtml === undefined
      ? settings.footerHtml
      : sanitizeFooterHtml(settings.footerHtml),
  faviconUrl:
    settings.faviconUrl === undefined
      ? settings.faviconUrl
      : normalizeOptionalUrl(settings.faviconUrl, { allowRelative: true }),
  homeUrl:
    settings.homeUrl === undefined
      ? settings.homeUrl
      : normalizeOptionalUrl(settings.homeUrl, { allowRelative: true }),
  logoUrl:
    settings.logoUrl === undefined
      ? settings.logoUrl
      : normalizeOptionalUrl(settings.logoUrl, { allowRelative: true }),
  themePreset:
    settings.themePreset === undefined
      ? settings.themePreset
      : normalizeThemePreset(settings.themePreset),
  themeColor:
    settings.themeColor === undefined
      ? settings.themeColor
      : normalizeThemeColor(settings.themeColor),
  timezone:
    settings.timezone === undefined
      ? settings.timezone
      : isAllowedTimezone(settings.timezone)
        ? settings.timezone
        : ''
})

const normalizeAdminSettingsPayload = (payload: SettingsMap & Record<string, unknown>) => ({
  ...payload,
  ...(payload.themePreset !== undefined
    ? { themePreset: normalizeThemePreset(payload.themePreset) }
    : {}),
  ...(payload.themeColor !== undefined
    ? { themeColor: normalizeThemeColor(payload.themeColor) }
    : {}),
  ...(payload.footerHtml !== undefined
    ? { footerHtml: sanitizeFooterHtml(payload.footerHtml) }
    : {})
})

export const systemSettingsService = {
  getPublicSettings() {
    return settingsService.getPublic()
  },

  getAdminSettings() {
    return sanitizeSettingsForOutput(settingsService.getAll())
  },

  updateAdminSettings(payload: Record<string, unknown> = {}) {
    const validatedPayload = validatePayload(adminSettingsSchema, payload, '设置参数不正确')
    const normalizedPayload = normalizeAdminSettingsPayload(validatedPayload as SettingsMap & Record<string, unknown>)

    if (!settingsService.updateAll(normalizedPayload)) {
      throw errors.internal('保存失败')
    }

    return undefined
  },

  setBackground(url: string = '') {
    const validatedUrl = validatePayload(backgroundUrlSchema, url, '背景图地址不正确')

    if (!settingsService.set('backgroundUrl', validatedUrl)) {
      throw errors.internal('保存失败')
    }

    return undefined
  }
}
