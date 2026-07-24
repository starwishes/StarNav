export type SiteThemePreset = 'classic' | 'gallery' | 'cinema'
export type ThemeMode = 'light' | 'dark'

export interface SiteThemeTokens {
  preset: SiteThemePreset
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

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const THEME_MODE_STORAGE_KEY = 'theme-mode'
const DEFAULT_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
const APPLE_FONT_STACK =
  '"SF Pro Text", "SF Pro Display", "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif'

export const DEFAULT_THEME_PRESET: SiteThemePreset = 'classic'

export const normalizeThemeMode = (value: unknown): ThemeMode =>
  value === 'dark' ? 'dark' : 'light'

export const getStoredThemeMode = (storage: Storage = localStorage): ThemeMode =>
  normalizeThemeMode(storage.getItem(THEME_MODE_STORAGE_KEY))

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

const PRESET_TOKENS: Record<SiteThemePreset, Omit<SiteThemeTokens, 'accentColor' | 'accentRgb'>> = {
  classic: {
    preset: 'classic',
    accentHover: '#337ecc',
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
  },
  gallery: {
    preset: 'gallery',
    accentHover: '#0066cc',
    pageGradient: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%)',
    pageBackdrop: 'rgba(245, 245, 247, 0.86)',
    panelBackground: 'rgba(255, 255, 255, 0.82)',
    panelSurface: 'rgba(255, 255, 255, 0.96)',
    panelBorder: 'rgba(29, 29, 31, 0.08)',
    panelShadow: '0 24px 48px rgba(0, 0, 0, 0.08)',
    textPrimary: '#1d1d1f',
    textMuted: 'rgba(29, 29, 31, 0.68)',
    fontBody: APPLE_FONT_STACK,
    fontDisplay: APPLE_FONT_STACK
  },
  cinema: {
    preset: 'cinema',
    accentHover: '#0077ed',
    pageGradient:
      'radial-gradient(circle at top, rgba(41, 151, 255, 0.18), transparent 35%), linear-gradient(180deg, #040404 0%, #111111 100%)',
    pageBackdrop: 'rgba(17, 17, 17, 0.74)',
    panelBackground: 'rgba(32, 32, 35, 0.8)',
    panelSurface: 'rgba(42, 42, 45, 0.92)',
    panelBorder: 'rgba(255, 255, 255, 0.08)',
    panelShadow: '0 30px 60px rgba(0, 0, 0, 0.42)',
    textPrimary: '#f5f5f7',
    textMuted: 'rgba(255, 255, 255, 0.68)',
    fontBody: APPLE_FONT_STACK,
    fontDisplay: APPLE_FONT_STACK
  }
}

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

export const normalizeThemePreset = (value: unknown): SiteThemePreset => {
  if (typeof value === 'string' && value in PRESET_TOKENS) {
    return value as SiteThemePreset
  }

  return DEFAULT_THEME_PRESET
}

export const normalizeThemeColor = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return ''
  }

  const normalized = trimmed.toLowerCase()
  if (normalized.length === 4) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`
  }

  return normalized
}

const colorToRgb = (hexColor: string) => {
  const normalized = normalizeThemeColor(hexColor) || PRESET_TOKENS.classic.accentHover
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)
  return `${red}, ${green}, ${blue}`
}

export const resolveThemeTokens = (
  presetInput?: unknown,
  colorInput?: unknown,
  modeInput?: unknown
): SiteThemeTokens => {
  const preset = normalizeThemePreset(presetInput)
  const mode = normalizeThemeMode(modeInput)
  const presetTokens = PRESET_TOKENS[preset]
  const themedTokens =
    mode === 'dark'
      ? {
          ...presetTokens,
          ...DARK_MODE_TOKEN_OVERRIDES
        }
      : presetTokens
  const accentColor = normalizeThemeColor(colorInput) || colorToHex(presetTokens.preset)

  return {
    ...themedTokens,
    accentColor,
    accentRgb: colorToRgb(accentColor)
  }
}

const colorToHex = (preset: SiteThemePreset) => {
  if (preset === 'gallery') return '#0071e3'
  if (preset === 'cinema') return '#2997ff'
  return '#409eff'
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
