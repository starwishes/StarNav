import { nextTick, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from '@/composables/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('updates the debounced ref only after the delay', async () => {
    const value = useDebounce('start', 50)
    const seen: string[] = []
    const stop = watch(value, (nextValue) => seen.push(nextValue))

    value.value = 'next'

    expect(value.value).toBe('start')

    await vi.advanceTimersByTimeAsync(49)
    expect(value.value).toBe('start')
    expect(seen).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    await nextTick()

    expect(value.value).toBe('next')
    expect(seen).toEqual(['next'])

    stop()
  })

  it('resets the timer when values change repeatedly', async () => {
    const value = useDebounce('start', 50)

    value.value = 'first'
    await vi.advanceTimersByTimeAsync(30)
    value.value = 'second'

    await vi.advanceTimersByTimeAsync(49)
    expect(value.value).toBe('start')

    await vi.advanceTimersByTimeAsync(1)
    expect(value.value).toBe('second')
  })
})
