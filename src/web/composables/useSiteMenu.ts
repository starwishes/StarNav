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

// 触发右键菜单的键盘键判定与组件共享，定义于 utils/events.ts（isContextMenuKey）。

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

  // 菜单打开后焦点会移入菜单（SiteContextMenu），关闭时归还到触发元素。
  // menuTriggerElement 记录可聚焦的触发元素（卡片的 <a>、子分类 tab、分类标题）；
  // restoreFocusOnClose 为 true 表示本次由键盘打开（键盘场景下任何关闭路径都应归还）。
  let menuTriggerElement: HTMLElement | null = null
  let restoreFocusOnClose = false

  const resolveMenuCoordinates = (event: Event): { x: number; y: number } => {
    // 键盘打开（ContextMenu 键 / Shift+F10）：没有 clientX/Y，菜单定位到触发元素下方
    if (event instanceof KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target) {
        const rect = target.getBoundingClientRect()
        return {
          x: clampToViewport(rect.left, window.innerWidth, ESTIMATED_MENU_WIDTH),
          y: clampToViewport(rect.bottom, window.innerHeight, ESTIMATED_MENU_HEIGHT)
        }
      }
      return { x: 0, y: 0 }
    }

    const mouseEvent = event as MouseEvent
    return {
      x: clampToViewport(mouseEvent.clientX, window.innerWidth, ESTIMATED_MENU_WIDTH),
      y: clampToViewport(mouseEvent.clientY, window.innerHeight, ESTIMATED_MENU_HEIGHT)
    }
  }

  const resolveTriggerElement = (event: Event): HTMLElement | null => {
    if (event instanceof KeyboardEvent) {
      return event.target instanceof HTMLElement ? event.target : null
    }
    const target = event.target instanceof Element ? event.target : null
    return target?.closest?.('a, button, [tabindex], [role="tab"]') ?? null
  }

  const showContextMenu = (e: Event, item: Item, catIdx: number, itemIdx: number) => {
    if (!adminStore.isAuthenticated) return
    e.preventDefault()
    Object.assign(contextMenu, {
      visible: true,
      ...resolveMenuCoordinates(e),
      item,
      category: null,
      catIndex: catIdx,
      itemIndex: itemIdx
    })
    menuTriggerElement = resolveTriggerElement(e)
    restoreFocusOnClose = e instanceof KeyboardEvent
  }

  const showCategoryContextMenu = (e: Event, category: Category, catIdx: number) => {
    if (!adminStore.isAuthenticated) return
    if (category.id === -1) return // Ignore virtual categories
    e.preventDefault()
    Object.assign(contextMenu, {
      visible: true,
      ...resolveMenuCoordinates(e),
      item: null,
      category,
      catIndex: catIdx
    })
    menuTriggerElement = resolveTriggerElement(e)
    restoreFocusOnClose = e instanceof KeyboardEvent
  }

  const closeContextMenu = () => {
    contextMenu.visible = false
    const trigger = menuTriggerElement
    menuTriggerElement = null

    // 判断是否需要把焦点归还触发元素（第 34 轮盲审 L4）：
    // - 键盘打开的任何关闭路径都要归还（restoreFocusOnClose）；
    // - Esc/选择动作关闭时焦点仍在菜单内（SiteContextMenu 打开即聚焦首项），也归还。
    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusIsInsideMenu =
      Boolean(activeElement) &&
      Boolean(document.querySelector('.context-menu')?.contains(activeElement))
    const shouldRestore = restoreFocusOnClose || focusIsInsideMenu
    restoreFocusOnClose = false

    if (!shouldRestore || !trigger || !trigger.isConnected) {
      return
    }

    // 外部指针交互落在其他可聚焦元素上时，浏览器已把焦点移过去，不再抢回；
    // 只有焦点悬空（body/已移除的菜单项）才归还到触发元素。
    const focusWasMovedElsewhere =
      Boolean(activeElement) &&
      activeElement !== document.body &&
      activeElement !== trigger &&
      !focusIsInsideMenu
    if (!focusWasMovedElsewhere) {
      trigger.focus({ preventScroll: true })
    }
  }

  // 键盘入口（ContextMenu 键 / Shift+F10）的判定在组件侧用 utils/events.ts 的
  // isContextMenuKey 完成：SiteCard/SiteCategory 识别后把事件沿既有 contextmenu
  // 事件流上抛，这里统一鉴权、定位与焦点归还（show* 方法区分 Mouse/Keyboard 事件）。

  // 注意：必须包一层无参调用——closeContextMenu 若直接作为监听器，会被传入
  // 事件对象（truthy），导致所有外部点击都被当作"归还焦点"路径处理。
  const handleDocumentClick = () => closeContextMenu()

  onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick)
  })

  return {
    contextMenu,
    showContextMenu,
    showCategoryContextMenu,
    closeContextMenu
  }
}
