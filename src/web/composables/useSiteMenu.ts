import { reactive, onMounted, onUnmounted } from 'vue'
import { useAdminStore } from '@/store/admin'
import type { Item, Category } from '@/types'

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  item: Item | null
  category: Category | null
  catIndex: number
  itemIndex: number
}

// 保守估计菜单尺寸，先把裸 clientX/Y 粗略钳制到视口内（主要防右侧/底部溢出）；
// SiteContextMenu 渲染后再按实测尺寸二次精调。
const VIEWPORT_MARGIN = 8
const ESTIMATED_MENU_WIDTH = 168
const ESTIMATED_MENU_HEIGHT = 264
const clampToViewport = (value: number, viewportSize: number, estimatedSize: number) =>
  Math.max(0, Math.min(value, viewportSize - estimatedSize - VIEWPORT_MARGIN))

export function useSiteMenu() {
  const adminStore = useAdminStore()

  const contextMenu = reactive<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
    category: null,
    catIndex: -1,
    itemIndex: -1
  })

  const showContextMenu = (e: MouseEvent, item: Item, catIdx: number, itemIdx: number) => {
    if (!adminStore.isAuthenticated) return
    e.preventDefault()
    Object.assign(contextMenu, {
      visible: true,
      x: clampToViewport(e.clientX, window.innerWidth, ESTIMATED_MENU_WIDTH),
      y: clampToViewport(e.clientY, window.innerHeight, ESTIMATED_MENU_HEIGHT),
      item,
      category: null,
      catIndex: catIdx,
      itemIndex: itemIdx
    })
  }

  const showCategoryContextMenu = (e: MouseEvent, category: Category, catIdx: number) => {
    if (!adminStore.isAuthenticated) return
    if (category.id === -1) return // Ignore virtual categories
    e.preventDefault()
    Object.assign(contextMenu, {
      visible: true,
      x: clampToViewport(e.clientX, window.innerWidth, ESTIMATED_MENU_WIDTH),
      y: clampToViewport(e.clientY, window.innerHeight, ESTIMATED_MENU_HEIGHT),
      item: null,
      category,
      catIndex: catIdx
    })
  }

  const closeContextMenu = () => {
    contextMenu.visible = false
  }

  onMounted(() => {
    document.addEventListener('click', closeContextMenu)
  })

  onUnmounted(() => {
    document.removeEventListener('click', closeContextMenu)
  })

  return {
    contextMenu,
    showContextMenu,
    showCategoryContextMenu,
    closeContextMenu
  }
}
