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
  fromCategoryId?: number // 增加原始分类ID记录
  x: number
  y: number
  hoverCatIndex: number
  hoverCategoryId: number // 增加目标分类ID记录
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

  // --- Mouse Drag ---

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!moveState.active) return
    moveState.x = e.clientX + 10
    moveState.y = e.clientY + 10
  }

  const handleMouseUp = async () => {
    if (!moveState.active) return
    const { item, hoverCatIndex, hoverCategoryId, hoverItemIndex } = moveState

    // 优先使用 ID 进行定位，如果 ID 无效则退回到索引（用于兼容无子分类的旧逻辑）
    const finalTargetId =
      hoverCategoryId > 0
        ? hoverCategoryId
        : hoverCatIndex !== -1
          ? getData()[hoverCatIndex]?.id
          : 0

    if (finalTargetId > 0 && item) {
      try {
        await dataStore.moveItem(item.id, finalTargetId, hoverItemIndex)
        ElMessage.success(t('table.moveSuccess'))
      } catch (error) {
        ElMessage.error(getErrorMessage(error, t('table.moveFail')))
      }
    }

    resetState()
    cleanupListeners()
  }

  const startMove = (
    item: Item,
    catIndex: number,
    itemIndex: number,
    initialX: number,
    initialY: number,
    closeMenuCallback?: () => void
  ) => {
    if (!adminStore.isAuthenticated) return

    moveState.item = JSON.parse(JSON.stringify(item))
    moveState.fromCatIndex = catIndex
    moveState.fromItemIndex = itemIndex
    moveState.active = true
    moveState.x = initialX
    moveState.y = initialY

    if (closeMenuCallback) closeMenuCallback()

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    ElMessage.info(t('context.dragDropClickHint'))
  }

  // --- Touch Drag ---

  let touchTimer: ReturnType<typeof setTimeout> | null = null
  const LONG_PRESS_DURATION = 500

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
        // Use explicit data attributes parsing logic
        requestAnimationFrame(() => {
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
    await handleMouseUp() // Reuse logic
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchEnd)
  }

  const handleTouchStart = (e: TouchEvent, item: Item, catIdx: number, itemIdx: number) => {
    if (!adminStore.isAuthenticated) return
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY

    touchTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50)
      moveState.item = JSON.parse(JSON.stringify(item))
      moveState.fromCatIndex = catIdx
      moveState.fromItemIndex = itemIdx
      moveState.active = true
      moveState.x = startX + 10
      moveState.y = startY + 10

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
    document.removeEventListener('mouseup', handleMouseUp)
  }

  onUnmounted(() => {
    cleanupListeners()
  })

  return {
    moveState,
    startMove,
    handleMouseEnter,
    handleTouchStart,
    handleMouseDragUp: handleMouseUp // Export for Click interruption check
  }
}
