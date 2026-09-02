export type ThemeMode = 'light' | 'dark'

export interface SiteThemeTokens {
  preset: 'classic'
  accentColor: string
  accentHover: string
  accentRgb: string
  pageGradient: string
  pageBackdrop: string
  panelBackground: string
  panelSurface: string
  panelBorder: string
  panelShadow: string
  textPrimary: string
  textMuted: string
  fontBody: string
  fontDisplay: string
}

const THEME_MODE_STORAGE_KEY = 'theme-mode'
const DEFAULT_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
const CLASSIC_ACCENT = '#409eff'
const CLASSIC_ACCENT_RGB = '64, 158, 255'

export const normalizeThemeMode = (value: unknown): ThemeMode =>
  value === 'dark' ? 'dark' : 'light'

const prefersDarkScheme = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
  } catch {
    return false
  }
}

export const getStoredThemeMode = (storage: Storage = localStorage): ThemeMode => {
  const stored = storage.getItem(THEME_MODE_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  // 与扩展端一致：无存储值（首访）时跟随系统深色偏好，而非恒 light。
  return prefersDarkScheme() ? 'dark' : 'light'
}

export const applyThemeMode = (
  modeInput: unknown,
  root: HTMLElement = document.documentElement,
  storage: Storage = localStorage
): ThemeMode => {
  const mode = normalizeThemeMode(modeInput)

  root.setAttribute('theme-mode', mode)

  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  storage.setItem(THEME_MODE_STORAGE_KEY, mode)
  return mode
}

export const toggleThemeMode = (
  currentMode: ThemeMode,
  root: HTMLElement = document.documentElement,
  storage: Storage = localStorage
): ThemeMode => applyThemeMode(currentMode === 'dark' ? 'light' : 'dark', root, storage)

const CLASSIC_TOKENS = {
  preset: 'classic',
  accentColor: CLASSIC_ACCENT,
  accentHover: '#337ecc',
  accentRgb: CLASSIC_ACCENT_RGB,
  pageGradient:
    'radial-gradient(circle at top right, rgba(64, 158, 255, 0.12), transparent 38%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
  pageBackdrop: 'rgba(255, 255, 255, 0.76)',
  panelBackground: 'rgba(255, 255, 255, 0.74)',
  panelSurface: 'rgba(255, 255, 255, 0.92)',
  panelBorder: 'rgba(148, 163, 184, 0.18)',
  panelShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
  textPrimary: '#0f172a',
  textMuted: 'rgba(71, 85, 105, 0.82)',
  fontBody: DEFAULT_FONT_STACK,
  fontDisplay: DEFAULT_FONT_STACK
} as const satisfies SiteThemeTokens

const DARK_MODE_TOKEN_OVERRIDES = {
  pageGradient:
    'radial-gradient(circle at top right, rgba(var(--ui-theme-rgb), 0.2), transparent 36%), linear-gradient(180deg, #020617 0%, #0f172a 44%, #111827 100%)',
  pageBackdrop: 'rgba(2, 6, 23, 0.78)',
  panelBackground: 'rgba(15, 23, 42, 0.72)',
  panelSurface: 'rgba(15, 23, 42, 0.9)',
  panelBorder: 'rgba(148, 163, 184, 0.18)',
  panelShadow: '0 22px 48px rgba(0, 0, 0, 0.42)',
  textPrimary: '#f8fafc',
  textMuted: 'rgba(226, 232, 240, 0.72)'
} satisfies Partial<SiteThemeTokens>

/** Resolve classic tokens for the current day/night mode. Preset/accent are no longer configurable. */
export const resolveThemeTokens = (modeInput?: unknown): SiteThemeTokens => {
  const mode = normalizeThemeMode(modeInput)
  if (mode === 'dark') {
    return {
      ...CLASSIC_TOKENS,
      ...DARK_MODE_TOKEN_OVERRIDES
    }
  }
  return { ...CLASSIC_TOKENS }
}

export const applyThemeTokens = (
  tokens: SiteThemeTokens,
  root: HTMLElement = document.documentElement
) => {
  root.setAttribute('data-theme-preset', tokens.preset)
  root.style.setProperty('--ui-theme', tokens.accentColor)
  root.style.setProperty('--ui-theme-rgb', tokens.accentRgb)
  root.style.setProperty('--ui-theme-hover', tokens.accentHover)
  root.style.setProperty('--ui-page-gradient', tokens.pageGradient)
  root.style.setProperty('--ui-page-backdrop', tokens.pageBackdrop)
  root.style.setProperty('--ui-panel-bg', tokens.panelBackground)
  root.style.setProperty('--ui-panel-surface', tokens.panelSurface)
  root.style.setProperty('--ui-panel-border', tokens.panelBorder)
  root.style.setProperty('--ui-panel-shadow', tokens.panelShadow)
  root.style.setProperty('--ui-text-primary', tokens.textPrimary)
  root.style.setProperty('--ui-text-muted', tokens.textMuted)
  root.style.setProperty('--ui-font-body', tokens.fontBody)
  root.style.setProperty('--ui-font-display', tokens.fontDisplay)
}
