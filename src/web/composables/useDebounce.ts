import { customRef, getCurrentScope, onScopeDispose } from 'vue'

/**
 * 防抖 Hook
 * 用于延迟执行频繁触发的操作（如搜索输入）
 *
 * @param value - 初始值
 * @param delay - 延迟时间（毫秒），默认 300ms
 * @returns 防抖后的 ref
 *
 * @example
 * const searchQuery = useDebounce('', 300)
 * // 用户输入会在停止输入 300ms 后才更新 searchQuery.value
 */
export function useDebounce<T>(value: T, delay = 300) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  // 组件卸载时清掉待执行的防抖定时器，避免已卸载组件仍触发副作用
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (timeout) {
        clearTimeout(timeout)
      }
    })
  }

  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue: T) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}
