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
      x: e.clientX,
      y: e.clientY,
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
      x: e.clientX,
      y: e.clientY,
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
