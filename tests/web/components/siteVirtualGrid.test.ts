import { describe, expect, it } from 'vitest'
import {
  estimateGridColumns,
  shouldVirtualizeSiteGrid,
  sliceVirtualGridItems,
  SITE_GRID_VIRTUALIZE_THRESHOLD
} from '@/components/index/siteVirtualGrid'

describe('siteVirtualGrid helpers', () => {
  it('estimates auto-fit columns from container width', () => {
    expect(estimateGridColumns(100)).toBe(1)
    expect(estimateGridColumns(250)).toBe(1)
    // floor((width + gap) / (minCard + gap))
    expect(estimateGridColumns(517)).toBe(1)
    expect(estimateGridColumns(518)).toBe(2)
    expect(estimateGridColumns(800)).toBeGreaterThanOrEqual(2)
  })

  it('only virtualizes large lists unless force-full is set', () => {
    expect(shouldVirtualizeSiteGrid(SITE_GRID_VIRTUALIZE_THRESHOLD - 1)).toBe(false)
    expect(shouldVirtualizeSiteGrid(SITE_GRID_VIRTUALIZE_THRESHOLD)).toBe(true)
    expect(shouldVirtualizeSiteGrid(200, true)).toBe(false)
  })

  it('slices a scroll window with stable original indices', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }))
    const slice = sliceVirtualGridItems(items, {
      scrollOffset: 0,
      viewportHeight: 400,
      columns: 4,
      rowStride: 100,
      overscanRows: 1
    })

    // rows visible ~ 400/100 = 4, +1 overscan => 5 rows * 4 = 20 items from start
    expect(slice.startIndex).toBe(0)
    expect(slice.items.length).toBeGreaterThan(0)
    expect(slice.items[0].index).toBe(0)
    expect(slice.items[0].item.id).toBe(1)
    expect(slice.totalHeight).toBe(Math.ceil(100 / 4) * 100)

    const mid = sliceVirtualGridItems(items, {
      scrollOffset: 800,
      viewportHeight: 400,
      columns: 4,
      rowStride: 100,
      overscanRows: 1
    })
    expect(mid.startIndex).toBeGreaterThan(0)
    expect(mid.offsetTop).toBe(mid.startIndex / 4 * 100)
    expect(mid.items.every((entry, offset) => entry.index === mid.startIndex + offset)).toBe(true)
  })
})
