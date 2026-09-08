/** API 客户端在 401 时派发的全局事件名；App.vue 监听它以清理登录态。 */
export const AUTH_CLEARED_EVENT = 'starnav:auth-cleared'

/**
 * 右键菜单的键盘等价键判定：Windows 上下文菜单键（ContextMenu）与 Shift+F10。
 * SiteCard/SiteCategory 的 keydown 处理器与 useSiteMenu 共享同一判定（第 34 轮 L4）。
 */
export const isContextMenuKey = (event: KeyboardEvent) =>
  event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
