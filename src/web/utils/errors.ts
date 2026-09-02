// 工具函数无 i18n 上下文，默认兜底文案使用中性英文；
// 所有调用方均显式传入本地化 fallback（见各 composable/组件），此值仅在漏传时兜底。
export const getErrorMessage = (error: unknown, fallback = 'Operation failed') => {
  if (typeof error === 'string') {
    return error || fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string' && error.message) {
      return error.message
    }

    if ('error' in error && typeof error.error === 'string' && error.error) {
      return error.error
    }
  }

  return fallback
}
