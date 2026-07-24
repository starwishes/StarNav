const DEFAULT_LANGUAGE = 'en'
const DEFAULT_LOCALE = 'en-US'
const DEFAULT_THEME_MODE = 'light'

export const toExtensionLanguage = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (normalized.startsWith('zh')) {
    return 'zh'
  }

  if (normalized.startsWith('en')) {
    return 'en'
  }

  return null
}

export const toSiteLocale = (value) => {
  const language = toExtensionLanguage(value)

  if (language === 'zh') {
    return 'zh-CN'
  }

  if (language === 'en') {
    return 'en-US'
  }

  return null
}

export const normalizeThemeMode = (value) => {
  if (value === 'dark') {
    return 'dark'
  }

  if (value === 'light') {
    return 'light'
  }

  return null
}

export const getBrowserLocale = (env = globalThis) => {
  const candidates = [
    env.chrome?.i18n?.getUILanguage?.(),
    env.navigator?.language,
    ...(Array.isArray(env.navigator?.languages) ? env.navigator.languages : [])
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }

  return DEFAULT_LOCALE
}

export const resolveExtensionLanguage = (preferences = {}, env = globalThis) => {
  const candidates = [preferences.lang, preferences.locale, getBrowserLocale(env)]

  for (const candidate of candidates) {
    const language = toExtensionLanguage(candidate)
    if (language) {
      return language
    }
  }

  return DEFAULT_LANGUAGE
}

export const resolveExtensionLocale = (preferences = {}, env = globalThis) => {
  const candidates = [preferences.locale]

  for (const candidate of candidates) {
    const locale = toSiteLocale(candidate)
    if (locale) {
      return locale
    }
  }

  return resolveExtensionLanguage(preferences, env) === 'zh' ? 'zh-CN' : DEFAULT_LOCALE
}

export const resolveExtensionThemeMode = (preferences = {}, env = globalThis) => {
  const explicitCandidates = [preferences.themeMode, preferences['theme-mode']]

  for (const candidate of explicitCandidates) {
    const mode = normalizeThemeMode(candidate)
    if (mode) {
      return mode
    }
  }

  return env.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : DEFAULT_THEME_MODE
}

export const applyDocumentLanguage = (languageInput, root = document.documentElement) => {
  const language = toExtensionLanguage(languageInput) || DEFAULT_LANGUAGE
  root.setAttribute('lang', language === 'zh' ? 'zh-CN' : 'en')
  return language
}

export const applyThemeMode = (modeInput, root = document.documentElement) => {
  const mode = normalizeThemeMode(modeInput) || DEFAULT_THEME_MODE
  root.setAttribute('theme-mode', mode)

  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  return mode
}
