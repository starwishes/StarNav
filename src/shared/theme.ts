export const DEFAULT_THEME_PRESET = 'classic' as const

export type ThemePresetKey = 'classic' | 'gallery' | 'cinema'

export const THEME_PRESETS = Object.freeze({
  classic: {
    accentColor: '#409eff'
  },
  gallery: {
    accentColor: '#0071e3'
  },
  cinema: {
    accentColor: '#2997ff'
  }
} as const satisfies Record<ThemePresetKey, { accentColor: string }>)

export const THEME_PRESET_KEYS = Object.freeze(Object.keys(THEME_PRESETS) as ThemePresetKey[])

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const normalizeThemePreset = (value: unknown): ThemePresetKey =>
  typeof value === 'string' && (THEME_PRESET_KEYS as readonly string[]).includes(value)
    ? (value as ThemePresetKey)
    : DEFAULT_THEME_PRESET

export const normalizeThemeColor = (value: unknown = ''): string => {
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

  const lower = trimmed.toLowerCase()
  if (lower.length === 4) {
    return `#${lower
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`
  }

  return lower
}

export const resolveThemeAccent = (preset: unknown, color: unknown = ''): string => {
  const normalizedColor = normalizeThemeColor(color)
  if (normalizedColor) {
    return normalizedColor
  }

  return THEME_PRESETS[normalizeThemePreset(preset)].accentColor
}
