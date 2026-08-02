import { nextTick, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce, throttle, useDebounce } from '@/composables/useDebounce'

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

  it('debounces function calls with the latest args and context', async () => {
    const calls: Array<[string, string]> = []
    const wrapped = debounce(function (this: { prefix: string }, value: string) {
      calls.push([this.prefix, value])
    }, 50)

    wrapped.call({ prefix: 'first' }, 'one')
    wrapped.call({ prefix: 'second' }, 'two')

    await vi.advanceTimersByTimeAsync(49)
    expect(calls).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    expect(calls).toEqual([['second', 'two']])
  })

  it('throttles function calls until the delay window passes', () => {
    const fn = vi.fn()
    const wrapped = throttle(fn, 100)

    wrapped('first')
    wrapped('second')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('first')

    vi.advanceTimersByTime(100)
    wrapped('third')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('third')
  })
})
