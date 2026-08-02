import { customRef } from 'vue'

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
  let timeout: ReturnType<typeof setTimeout>

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

/**
 * 防抖函数（通用版本）
 *
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * 限制函数在指定时间内只执行一次（如滚动事件）
 *
 * @param fn - 要节流的函数
 * @param delay - 时间间隔（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: never[]) => unknown>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn.apply(this, args)
    }
  }
}
