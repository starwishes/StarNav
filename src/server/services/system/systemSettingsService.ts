import { settingsService } from './settingsService.js'
import { errors } from '../../middleware/errorHandler.js'
import { adminSettingsSchema, backgroundUrlSchema } from '../../middleware/validation.js'
import { sanitizeFooterHtml } from '../../../shared/security/footerHtml.js'
import { isAllowedTimezone, normalizeOptionalUrl } from '../../../shared/security/urlSafety.js'
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

const sanitizeSettingsForOutput = (settings: SettingsMap = {}) => {
  // Drop removed/legacy theme keys if they still exist in older DBs.
  const {
    themePreset: _removedThemePreset,
    themeColor: _removedThemeColor,
    ...rest
  } = settings

  return {
    ...rest,
    backgroundUrl:
      rest.backgroundUrl === undefined
        ? rest.backgroundUrl
        : normalizeOptionalUrl(rest.backgroundUrl, { allowRelative: true }),
    footerHtml:
      rest.footerHtml === undefined
        ? rest.footerHtml
        : sanitizeFooterHtml(rest.footerHtml),
    faviconUrl:
      rest.faviconUrl === undefined
        ? rest.faviconUrl
        : normalizeOptionalUrl(rest.faviconUrl, { allowRelative: true }),
    homeUrl:
      rest.homeUrl === undefined
        ? rest.homeUrl
        : normalizeOptionalUrl(rest.homeUrl, { allowRelative: true }),
    logoUrl:
      rest.logoUrl === undefined
        ? rest.logoUrl
        : normalizeOptionalUrl(rest.logoUrl, { allowRelative: true }),
    timezone:
      rest.timezone === undefined
        ? rest.timezone
        : isAllowedTimezone(rest.timezone)
          ? rest.timezone
          : ''
  }
}

const REMOVED_SETTINGS_KEYS = ['themePreset', 'themeColor'] as const

const stripRemovedSettingsKeys = (payload: Record<string, unknown> = {}) => {
  const next = { ...payload }
  for (const key of REMOVED_SETTINGS_KEYS) {
    delete next[key]
  }
  return next
}

const normalizeAdminSettingsPayload = (payload: SettingsMap & Record<string, unknown>) => ({
  ...payload,
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
    // Accept and drop removed theme keys so older clients/payloads do not 400.
    const cleanedPayload = stripRemovedSettingsKeys(payload)
    const validatedPayload = validatePayload(adminSettingsSchema, cleanedPayload, '设置参数不正确')
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
