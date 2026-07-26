import { isAllowedTimezone } from '../../shared/security/urlSafety.js'

/**
 * Resolve deploy-time timezone from `TZ` (compose/env).
 * Empty/invalid → '' (browser-local display).
 */
export const resolveEnvTimezone = (): string => {
  const raw = String(process.env.TZ || '').trim()
  return isAllowedTimezone(raw) ? raw : ''
}
