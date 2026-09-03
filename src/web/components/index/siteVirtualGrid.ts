/** Pure helpers for windowed site-card grids (large categories). */

const SITE_CARD_MIN_WIDTH = 250
const SITE_GRID_GAP = 18
/** Approximate card block height + gap; used for scroll windowing only. */
export const SITE_GRID_ROW_STRIDE = 138
/** Below this count, render every card (cheap; keeps tests simple). */
export const SITE_GRID_VIRTUALIZE_THRESHOLD = 36
const SITE_GRID_OVERSCAN_ROWS = 3

export type VirtualGridSlice<T> = {
  startIndex: number
  endIndex: number
  offsetTop: number
  totalHeight: number
  items: Array<{ item: T; index: number }>
}

export const estimateGridColumns = (
  containerWidth: number,
  minCardWidth = SITE_CARD_MIN_WIDTH,
  gap = SITE_GRID_GAP
) => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return 1
  }

  // Matches CSS: repeat(auto-fit, minmax(min(100%, minCard), 1fr))
  const usable = Math.max(containerWidth, minCardWidth)
  return Math.max(1, Math.floor((usable + gap) / (minCardWidth + gap)))
}

/**
 * Given grid geometry and how far the grid has scrolled relative to the
 * viewport, return the inclusive-exclusive item window to mount.
 */
export const sliceVirtualGridItems = <T>(
  items: T[],
  options: {
    /** Distance from the top of the grid that is above the viewport top. */
    scrollOffset: number
    viewportHeight: number
    columns: number
    rowStride?: number
    overscanRows?: number
  }
): VirtualGridSlice<T> => {
  const total = items.length
  const columns = Math.max(1, options.columns || 1)
  const rowStride = options.rowStride ?? SITE_GRID_ROW_STRIDE
  const overscanRows = options.overscanRows ?? SITE_GRID_OVERSCAN_ROWS
  const viewportHeight = Math.max(0, options.viewportHeight)
  const scrollOffset = Math.max(0, options.scrollOffset)

  if (total === 0) {
    return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0, items: [] }
  }

  const totalRows = Math.ceil(total / columns)
  const totalHeight = totalRows * rowStride
  const startRow = Math.max(0, Math.floor(scrollOffset / rowStride) - overscanRows)
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollOffset + viewportHeight) / rowStride) + overscanRows
  )
  const startIndex = startRow * columns
  const endIndex = Math.min(total, endRow * columns)

  return {
    startIndex,
    endIndex,
    offsetTop: startRow * rowStride,
    totalHeight,
    items: items.slice(startIndex, endIndex).map((item, offset) => ({
      item,
      index: startIndex + offset
    }))
  }
}

export const shouldVirtualizeSiteGrid = (
  itemCount: number,
  forceFullRender = false,
  threshold = SITE_GRID_VIRTUALIZE_THRESHOLD
) => !forceFullRender && itemCount >= threshold
