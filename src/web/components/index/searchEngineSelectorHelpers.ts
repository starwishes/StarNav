import { Favicon } from '@/config'
import { getSuggestionProviderType, type SearchEngineOption } from './searchUtils'
import { isRenderableIconUrl } from './siteIconHelpers'

export const isSuggestionSupported = (engine: SearchEngineOption) =>
  Boolean(getSuggestionProviderType(engine))

export const buildOriginFaviconUrl = (url: string) => {
  try {
    return `${new URL(url).origin}/favicon.ico`
  } catch {
    return ''
  }
}

export const getEngineInitial = (name: string) => {
  const firstCharacter = Array.from(name?.trim?.() || '')[0] || '?'
  return /[a-z]/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter
}

const getEngineProxyIcon = (url: string) => {
  if (!url) {
    return ''
  }

  try {
    const urlObj = new URL(url)
    return `${Favicon}${urlObj.origin}`
  } catch {
    return ''
  }
}

const getEngineIconCandidates = (url: string) =>
  [buildOriginFaviconUrl(url), getEngineProxyIcon(url)].filter(
    (candidate, index, list) => candidate && list.indexOf(candidate) === index
  )

export const resolveEngineIcon = (url: string, brokenIconIndexes: Record<string, number>) => {
  const iconIndex = brokenIconIndexes[url] || 0
  const iconCandidates = getEngineIconCandidates(url)
  const candidate = iconCandidates[iconIndex] || ''
  return isRenderableIconUrl(candidate) ? candidate : ''
}

export const advanceBrokenEngineIcon = (url: string, brokenIconIndexes: Record<string, number>) => {
  const currentIndex = brokenIconIndexes[url] || 0
  const iconCandidates = getEngineIconCandidates(url)

  if (currentIndex < iconCandidates.length - 1) {
    brokenIconIndexes[url] = currentIndex + 1
    return
  }

  brokenIconIndexes[url] = iconCandidates.length
}

export interface EnginePanelPositionInput {
  triggerRect: DOMRect
  panelHeight: number
  engineCount: number
  showActions: boolean
  viewportWidth: number
  viewportHeight: number
  panelWidthMax?: number
  viewportMargin?: number
  panelGap?: number
}

export const computeEnginePanelPosition = ({
  triggerRect,
  panelHeight,
  engineCount,
  showActions,
  viewportWidth,
  viewportHeight,
  panelWidthMax = 280,
  viewportMargin = 12,
  panelGap = 10
}: EnginePanelPositionInput) => {
  const availableViewportHeight = Math.max(0, viewportHeight - viewportMargin * 2)
  const panelWidth = Math.min(panelWidthMax, Math.max(0, viewportWidth - viewportMargin * 2))
  const estimatedPanelHeight = panelHeight || engineCount * 52 + (showActions ? 68 : 12)
  const belowTop = triggerRect.bottom + panelGap
  const availableBelow = Math.max(0, viewportHeight - belowTop - viewportMargin)
  const availableAbove = Math.max(0, triggerRect.top - panelGap - viewportMargin)
  const shouldPlaceAbove = availableBelow < estimatedPanelHeight && availableAbove > availableBelow
  const top = shouldPlaceAbove
    ? Math.max(
        viewportMargin,
        triggerRect.top - panelGap - Math.min(estimatedPanelHeight, availableViewportHeight)
      )
    : Math.max(viewportMargin, belowTop)
  const maxLeft = Math.max(viewportMargin, viewportWidth - panelWidth - viewportMargin)

  return {
    top,
    left: Math.min(Math.max(triggerRect.left, viewportMargin), maxLeft),
    width: panelWidth,
    maxHeight: shouldPlaceAbove
      ? Math.min(availableViewportHeight, Math.max(0, triggerRect.top - panelGap - top))
      : Math.min(availableViewportHeight, Math.max(0, viewportHeight - top - viewportMargin))
  }
}
