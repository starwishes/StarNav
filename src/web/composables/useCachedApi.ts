import { ref, Ref } from 'vue'
import { createScopedLogger } from '../../shared/logger.js'

const logger = createScopedLogger('web:cache')

/**
 * API 请求缓存 Hook
 * 缓存 API 请求结果，避免重复请求相同数据
 *
 * @param fetchFn - 获取数据的函数
 * @param cacheKey - 缓存键名
 * @param ttl - 缓存有效期（毫秒），默认 5 分钟
 */
export function useCachedApi<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  ttl = 5 * 60 * 1000 // 5 分钟
) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const lastFetchTime = ref<number>(0)

  /**
   * 获取数据（带缓存）
   */
  const fetch = async (forceRefresh = false) => {
    const now = Date.now()
    const isCacheValid = now - lastFetchTime.value < ttl

    // 如果缓存有效且不强制刷新，直接返回缓存数据
    if (!forceRefresh && isCacheValid && data.value !== null) {
      return data.value
    }

    loading.value = true
    error.value = null

    try {
      const result = await fetchFn()
      data.value = result
      lastFetchTime.value = now

      // 可选：持久化到 localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            `cache_${cacheKey}`,
            JSON.stringify({
              data: result,
              timestamp: now
            })
          )
        } catch (e) {
          logger.warn('Failed to cache data to localStorage.', e)
        }
      }

      return result
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * 从 localStorage 恢复缓存
   */
  const restoreFromStorage = () => {
    if (typeof window === 'undefined') return false

    try {
      const cached = localStorage.getItem(`cache_${cacheKey}`)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        const now = Date.now()

        if (now - timestamp < ttl) {
          data.value = cachedData
          lastFetchTime.value = timestamp
          return true
        }
      }
    } catch (e) {
      logger.warn('Failed to restore cache from localStorage.', e)
    }

    return false
  }

  /**
   * 清除缓存
   */
  const clearCache = () => {
    data.value = null
    lastFetchTime.value = 0

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cache_${cacheKey}`)
      } catch (e) {
        logger.warn('Failed to clear cache from localStorage.', e)
      }
    }
  }

  return {
    data,
    loading,
    error,
    fetch,
    restoreFromStorage,
    clearCache
  }
}
