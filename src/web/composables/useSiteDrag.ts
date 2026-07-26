import { reactive, onUnmounted, type Ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import { useDataStore } from '@/store/data'
import { useAdminStore } from '@/store/admin'
import type { Item, Category } from '@/types'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from 'vue-i18n'

interface MoveState {
  active: boolean
  item: Item | null
  fromCatIndex: number
  fromItemIndex: number
  fromCategoryId?: number
  x: number
  y: number
  hoverCatIndex: number
  hoverCategoryId: number
  hoverItemIndex: number
}

export function useSiteDrag(dataSource: Ref<Category[]> | (() => Category[])) {
  const { t } = useI18n()
  const dataStore = useDataStore()
  const adminStore = useAdminStore()

  // Helper to get value whether it's ref or getter
  const getData = (): Category[] => {
    if (typeof dataSource === 'function') return dataSource()
    return dataSource.value
  }

  const moveState = reactive<MoveState>({
    active: false,
    item: null,
    fromCatIndex: -1,
    fromItemIndex: -1,
    fromCategoryId: 0,
    x: 0,
    y: 0,
    hoverCatIndex: -1,
    hoverCategoryId: 0,
    hoverItemIndex: -1
  })

  // Prevent stacked commits while a previous move request is still in flight.
  let isCommitting = false

  // --- Mouse placement (click-to-drop; do NOT commit on mouseup) ---

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!moveState.active) return
    moveState.x = e.clientX + 10
    moveState.y = e.clientY + 10
  }

  /**
   * Commit the in-progress placement.
   * Interaction mode ends immediately so the UI does not stay "stuck" while the API runs.
   * Mouse placement is click-driven (see Site.vue item click); touch uses touchend.
   */
  const restoreScrollY = (scrollY: number) => {
    if (typeof window === 'undefined') {
      return
    }
    // Double-rAF waits for layout after Vue patches the reordered grid.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior })
      })
    })
  }

  const commitMove = async () => {
    if (!moveState.active || isCommitting) {
      return
    }

    const {
      item,
      hoverCatIndex,
      hoverCategoryId,
      hoverItemIndex,
      fromCategoryId,
      fromItemIndex
    } = moveState
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0

    // End placement mode first so further clicks do not re-enter commit.
    isCommitting = true
    resetState()
    cleanupListeners()
    cleanupTouchListeners()

    const finalTargetId =
      hoverCategoryId > 0
        ? hoverCategoryId
        : hoverCatIndex !== -1
          ? getData()[hoverCatIndex]?.id
          : 0

    const hasValidDropTarget = Boolean(finalTargetId > 0 && item && hoverItemIndex >= 0)
    const isNoOpSameSlot =
      hasValidDropTarget &&
      Number(fromCategoryId) === Number(finalTargetId) &&
      fromItemIndex === hoverItemIndex

    if (!hasValidDropTarget || isNoOpSameSlot || !item) {
      isCommitting = false
      restoreScrollY(scrollY)
      return
    }

    try {
      await dataStore.moveItem(item.id, finalTargetId, hoverItemIndex)
      ElMessage.closeAll()
      ElMessage.success(t('table.moveSuccess'))
    } catch (error) {
      ElMessage.error(getErrorMessage(error, t('table.moveFail')))
    } finally {
      isCommitting = false
      restoreScrollY(scrollY)
    }
  }

  const startMove = (
    item: Item,
    catIndex: number,
    itemIndex: number,
    initialX: number,
    initialY: number,
    closeMenuCallback?: () => void
  ) => {
    if (!adminStore.isAuthenticated || isCommitting) return

    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0

    moveState.item = JSON.parse(JSON.stringify(item))
    moveState.fromCatIndex = catIndex
    moveState.fromItemIndex = itemIndex
    moveState.fromCategoryId = Number(item.categoryId) || 0
    moveState.active = true
    moveState.x = initialX
    moveState.y = initialY
    // Seed hover with origin so same-category drops still have a valid target index.
    moveState.hoverCategoryId = moveState.fromCategoryId
    moveState.hoverItemIndex = itemIndex

    if (closeMenuCallback) closeMenuCallback()

    // Ghost follows the cursor; placement is committed by click (not mouseup).
    document.addEventListener('mousemove', handleGlobalMouseMove)
    ElMessage.info(t('context.dragDropClickHint'))
    // Guard against any layout thrash from menu close / ghost mount.
    restoreScrollY(scrollY)
  }

  // --- Touch Drag ---

  let touchTimer: ReturnType<typeof setTimeout> | null = null
  const LONG_PRESS_DURATION = 500

  const cleanupTouchListeners = () => {
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchEnd)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!moveState.active) return
    e.preventDefault()
    const touch = e.touches[0]
    moveState.x = touch.clientX + 10
    moveState.y = touch.clientY + 10

    const elem = document.elementFromPoint(touch.clientX, touch.clientY)
    if (elem) {
      const siteWrapper = elem.closest('.site-wrapper')
      if (siteWrapper) {
        requestAnimationFrame(() => {
          if (!moveState.active) return
          const catIndex = parseInt(siteWrapper.getAttribute('data-cat-index') || '-1')
          const catId = parseInt(siteWrapper.getAttribute('data-cat-id') || '0')
          const itemIndex = parseInt(siteWrapper.getAttribute('data-item-index') || '-1')
          moveState.hoverCatIndex = catIndex
          moveState.hoverCategoryId = catId
          moveState.hoverItemIndex = itemIndex
        })
      }
    }
  }

  const handleTouchEnd = async () => {
    if (touchTimer) {
      clearTimeout(touchTimer)
      touchTimer = null
    }
    if (!moveState.active) return
    await commitMove()
  }

  const handleTouchStart = (e: TouchEvent, item: Item, catIdx: number, itemIdx: number) => {
    if (!adminStore.isAuthenticated || isCommitting) return
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY

    touchTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50)
      moveState.item = JSON.parse(JSON.stringify(item))
      moveState.fromCatIndex = catIdx
      moveState.fromItemIndex = itemIdx
      moveState.fromCategoryId = Number(item.categoryId) || 0
      moveState.active = true
      moveState.x = startX + 10
      moveState.y = startY + 10
      moveState.hoverCategoryId = moveState.fromCategoryId
      moveState.hoverItemIndex = itemIdx

      ElMessage.info(t('context.dragDropReleaseHint'))
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('touchcancel', handleTouchEnd)
    }, LONG_PRESS_DURATION)
  }

  // --- Common ---

  const handleMouseEnter = (itemIndex: number, categoryId: number) => {
    if (!moveState.active) return
    moveState.hoverCategoryId = categoryId
    moveState.hoverItemIndex = itemIndex
  }

  const resetState = () => {
    moveState.active = false
    moveState.item = null
    moveState.hoverCatIndex = -1
    moveState.hoverCategoryId = 0
    moveState.hoverItemIndex = -1
  }

  const cleanupListeners = () => {
    document.removeEventListener('mousemove', handleGlobalMouseMove)
  }

  const cancelMove = () => {
    if (touchTimer) {
      clearTimeout(touchTimer)
      touchTimer = null
    }
    resetState()
    cleanupListeners()
    cleanupTouchListeners()
  }

  onUnmounted(() => {
    cancelMove()
  })

  return {
    moveState,
    startMove,
    handleMouseEnter,
    handleTouchStart,
    handleMouseDragUp: commitMove,
    cancelMove
  }
}
