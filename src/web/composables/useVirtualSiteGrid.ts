import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

import {
  estimateGridColumns,
  shouldVirtualizeSiteGrid,
  sliceVirtualGridItems,
  SITE_GRID_ROW_STRIDE,
  type VirtualGridSlice
} from '@/components/index/siteVirtualGrid'

type UseVirtualSiteGridOptions<T> = {
  items: Ref<T[]>
  /** When true (e.g. drag-move active), mount the full list for drop targets. */
  forceFullRender?: Ref<boolean>
  rootMarginPx?: number
}

/**
 * Window large site-card grids against the window scrollport.
 * Small lists and drag-move mode stay fully rendered.
 */
export function useVirtualSiteGrid<T>(options: UseVirtualSiteGridOptions<T>) {
  const gridRef = ref<HTMLElement | null>(null)
  const columns = ref(1)
  const scrollOffset = ref(0)
  const viewportHeight = ref(
    typeof window !== 'undefined' ? window.innerHeight || 800 : 800
  )

  let resizeObserver: ResizeObserver | null = null

  const measure = () => {
    const el = gridRef.value
    if (!el) {
      return
    }

    const width = el.clientWidth || el.getBoundingClientRect().width
    columns.value = estimateGridColumns(width)

    const rect = el.getBoundingClientRect()
    // How much of the grid is above the viewport top (0 if top is still visible).
    scrollOffset.value = Math.max(0, -rect.top)
    viewportHeight.value = window.innerHeight || 800
  }

  const virtualized = computed(() =>
    shouldVirtualizeSiteGrid(options.items.value.length, options.forceFullRender?.value === true)
  )

  const slice = computed<VirtualGridSlice<T>>(() => {
    const items = options.items.value
    if (!virtualized.value) {
      return {
        startIndex: 0,
        endIndex: items.length,
        offsetTop: 0,
        totalHeight: 0,
        items: items.map((item, index) => ({ item, index }))
      }
    }

    return sliceVirtualGridItems(items, {
      scrollOffset: scrollOffset.value,
      viewportHeight: viewportHeight.value + (options.rootMarginPx ?? 200),
      columns: columns.value,
      rowStride: SITE_GRID_ROW_STRIDE
    })
  })

  const spacerStyle = computed(() => {
    if (!virtualized.value) {
      return { paddingTop: '0px', minHeight: '0px' }
    }

    const { offsetTop, totalHeight, items } = slice.value
    const renderedRows = Math.ceil(items.length / Math.max(1, columns.value))
    const renderedHeight = renderedRows * SITE_GRID_ROW_STRIDE
    const paddingBottom = Math.max(0, totalHeight - offsetTop - renderedHeight)

    return {
      paddingTop: `${offsetTop}px`,
      paddingBottom: `${paddingBottom}px`,
      minHeight: `${totalHeight}px`
    }
  })

  onMounted(() => {
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => measure())
      if (gridRef.value) {
        resizeObserver.observe(gridRef.value)
      }
    }
  })

  watch(gridRef, (el, _prev, onCleanup) => {
    if (!el || typeof ResizeObserver !== 'function') {
      return
    }
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => measure())
    }
    resizeObserver.observe(el)
    measure()
    onCleanup(() => {
      resizeObserver?.unobserve(el)
    })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', measure)
    window.removeEventListener('resize', measure)
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    gridRef,
    virtualized,
    visibleItems: computed(() => slice.value.items),
    spacerStyle,
    measure
  }
}
