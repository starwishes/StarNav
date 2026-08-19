import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { publicApi } from '@/api'
import { sanitizeFooterHtml } from '../../shared/security/footerHtml.js'
import { isAllowedTimezone, normalizeOptionalUrl } from '../../shared/security/urlSafety.js'
import { createScopedLogger } from '../../shared/logger.js'
import { applyThemeTokens, getStoredThemeMode, resolveThemeTokens } from '@/utils/theme'

export interface PublicSiteConfig {
  siteName: string
  logoUrl: string
  faviconUrl: string
  backgroundUrl: string
  footerHtml: string
  homeUrl: string
  registrationEnabled: boolean
  timezone: string
}

const STORAGE_KEY = 'siteConfig'
const DEFAULT_SITE_NAME = '星语导航'
const DEFAULT_FAVICON = '/favicon.svg?v=2'
const logger = createScopedLogger('web:config-store')
const DEFAULT_CONFIG: PublicSiteConfig = {
  siteName: '',
  logoUrl: '',
  faviconUrl: '',
  backgroundUrl: '',
  footerHtml: '',
  homeUrl: '',
  registrationEnabled: false,
  timezone: ''
}

// backgroundUrl is interpolated into `url('${...}')` CSS (see applyConfig), so
// quotes/backslash/control chars could break out of the string literal and inject
// CSS. Reject them outright in addition to the http(s)/relative scheme check.
const sanitizeBackgroundUrl = (value: unknown): string => {
  const candidate = normalizeOptionalUrl(typeof value === 'string' ? value : '', {
    allowRelative: true
  })
  if (!candidate) {
    return ''
  }
  if (/['"\\\u0000-\u001f\u007f-\u009f]/.test(candidate)) {
    return ''
  }
  return candidate
}

const sanitizePublicSiteConfig = (config: Partial<PublicSiteConfig> = {}): PublicSiteConfig => ({
  siteName: typeof config.siteName === 'string' ? config.siteName.trim().slice(0, 80) : '',
  logoUrl: normalizeOptionalUrl(config.logoUrl || '', { allowRelative: true }),
  faviconUrl: normalizeOptionalUrl(config.faviconUrl || '', { allowRelative: true }),
  backgroundUrl: sanitizeBackgroundUrl(config.backgroundUrl || ''),
  footerHtml: sanitizeFooterHtml(config.footerHtml || ''),
  homeUrl: normalizeOptionalUrl(config.homeUrl || '', { allowRelative: true }),
  registrationEnabled: Boolean(config.registrationEnabled),
  timezone: isAllowedTimezone(config.timezone) ? config.timezone || '' : ''
})

const readStoredConfig = (): PublicSiteConfig => {
  const storedConfig = localStorage.getItem(STORAGE_KEY)
  if (!storedConfig) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    return { ...DEFAULT_CONFIG, ...sanitizePublicSiteConfig(JSON.parse(storedConfig)) }
  } catch (error) {
    logger.error('Failed to parse stored config.', error)
    return { ...DEFAULT_CONFIG }
  }
}

const persistConfig = (config: PublicSiteConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export const useConfigStore = defineStore('config', () => {
  const siteConfig = ref<PublicSiteConfig>(readStoredConfig())
  const loading = ref(false)
  const loaded = ref(false)
  let inflightRequest: Promise<PublicSiteConfig> | null = null

  const displaySiteName = computed(() => siteConfig.value.siteName || DEFAULT_SITE_NAME)

  const applyConfig = () => {
    const { siteName, faviconUrl, backgroundUrl } = siteConfig.value
    applyThemeTokens(resolveThemeTokens(getStoredThemeMode()))

    document.title = siteName || DEFAULT_SITE_NAME

    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl || DEFAULT_FAVICON

    if (backgroundUrl) {
      document.documentElement.style.setProperty('--bg-image', `url('${backgroundUrl}')`)
      Object.assign(document.body.style, {
        backgroundImage: `url('${backgroundUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      })
      return
    }

    document.documentElement.style.removeProperty('--bg-image')
    Object.assign(document.body.style, {
      backgroundImage: '',
      backgroundSize: '',
      backgroundPosition: '',
      backgroundRepeat: '',
      backgroundAttachment: '',
      backgroundColor: '',
      color: ''
    })
  }

  const updateConfig = (newConfig: Partial<PublicSiteConfig>) => {
    siteConfig.value = sanitizePublicSiteConfig({ ...siteConfig.value, ...newConfig })
    persistConfig(siteConfig.value)
    loaded.value = true
    applyConfig()
  }

  const fetchConfig = async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && loaded.value) {
      return siteConfig.value
    }

    if (!force && inflightRequest) {
      return inflightRequest
    }

    inflightRequest = (async () => {
      loading.value = true

      try {
        updateConfig(await publicApi.getSettings())
        return siteConfig.value
      } catch (error) {
        logger.error('Failed to load public settings.', error)
        applyConfig()
        throw error
      } finally {
        loading.value = false
        inflightRequest = null
      }
    })()

    return inflightRequest
  }

  const ensureLoaded = () => {
    if (loaded.value) {
      return Promise.resolve(siteConfig.value)
    }

    if (inflightRequest) {
      return inflightRequest
    }

    return fetchConfig()
  }

  applyConfig()

  return {
    siteConfig,
    displaySiteName,
    loading,
    loaded,
    fetchConfig,
    ensureLoaded,
    updateConfig
  }
})
