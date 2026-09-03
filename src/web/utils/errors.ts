import { ApiClientError } from '@/api/client'

/**
 * UI 上屏错误文案的统一判定（第 21 轮审查：收口各 composable/组件对任意 Error 原文上屏的
 * 幸存者——网络层 'Failed to fetch' 等 message 上屏既暴露引擎内部细节也无法指导用户）。
 *
 * 工具模块无 i18n 上下文，fallback 默认中性英文；所有调用方必须显式传入本地化 fallback
 * （见各 composable/组件/store 的 t('...')），此值仅在漏传时兜底。
 *
 * 分类规则：
 * - ApiClientError（client.ts 对非 2xx 响应抛出的领域错误，message = 服务端 envelope 业务
 *   文案或通用 HTTP 文案）→ 原样上屏；
 * - 已 resolve 的服务端失败信封对象（{ success: false, error }，如 updateAdminSettings 返回
 *   的 res）→ 上屏 error/message 字段；
 * - 应用显式抛出的字符串（如 ElMessageBox 的 'cancel' 拒绝原因）→ 原样透传（调用方按需拦截）；
 * - 其余值——网络层原生 Error（TypeError: Failed to fetch / DOMException 超时等，message 可能
 *   携带引擎内部细节）与未知形态 → 一律返回调用方 i18n fallback，不把 message 上屏。
 */
export const getErrorMessage = (error: unknown, fallback = 'Operation failed'): string => {
  if (typeof error === 'string') {
    return error || fallback
  }

  if (error instanceof ApiClientError) {
    return error.message || fallback
  }

  if (error && typeof error === 'object' && !(error instanceof Error)) {
    // 仅信任"纯对象"信封（JSON 解析出的服务端失败响应）：DOMException（fetch 超时/中断）
    // 等异常对象虽带 message/name，但属引擎异常而非业务信封，不能据此回显原文
    const prototype = Object.getPrototypeOf(error)
    const isPlainObject = prototype === Object.prototype || prototype === null
    if (isPlainObject) {
      if ('error' in error && typeof error.error === 'string' && error.error) {
        return error.error
      }

      if ('message' in error && typeof error.message === 'string' && error.message) {
        return error.message
      }
    }
  }

  return fallback
}
