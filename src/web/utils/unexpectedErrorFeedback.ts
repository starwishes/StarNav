import { ElMessage } from '@/utils/feedback'
import i18n from '@/plugins/i18n'

/** 全局错误 toast 节流窗口：同一时间窗内只提示一次，避免错误风暴打爆 UI。 */
const TOAST_THROTTLE_MS = 30_000
let lastShownAt = 0

/**
 * 一次性向用户提示"发生了错误，请刷新重试"。
 * 供 app.config.errorHandler 与 window unhandledrejection 兜底使用；重复错误在
 * 节流窗口内只弹一次（第 15 轮审查：避免 toast 风暴）。
 */
export const notifyUnexpectedError = () => {
  const now = Date.now()
  if (now - lastShownAt < TOAST_THROTTLE_MS) {
    return
  }
  lastShownAt = now
  ElMessage.error(i18n.global.t('feedback.unexpectedError'))
}

/**
 * stale-asset 自愈被跳过（本会话已重载过）时的一次性提示：
 * 资源确已更新但放弃自动重载，请用户手动刷新。
 */
export const notifyStaleAssetReloadNeeded = () => {
  const now = Date.now()
  if (now - lastShownAt < TOAST_THROTTLE_MS) {
    return
  }
  lastShownAt = now
  ElMessage.error(i18n.global.t('feedback.staleAssetsReload'))
}
