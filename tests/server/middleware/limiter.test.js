import { beforeEach, describe, expect, it, vi } from 'vitest'

const rateLimit = vi.fn((options) => ({ options }))

vi.mock('express-rate-limit', () => ({
  default: rateLimit
}))

const { dataUpdateLimiter, loginLimiter } = await import('../../../src/server/middleware/limiter.js')

describe('limiter middleware config', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV
  })

  it('registers the current login limiter configuration', () => {
    expect(rateLimit).toHaveBeenNthCalledWith(1, {
      windowMs: 15 * 60 * 1000,
      max: 10,
      skip: expect.any(Function),
      message: { error: '尝试过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false
    })

    expect(loginLimiter.options.skip()).toBe(false)
    process.env.NODE_ENV = 'test'
    expect(loginLimiter.options.skip()).toBe(true)
  })

  it('registers the current data update limiter configuration', () => {
    expect(rateLimit).toHaveBeenNthCalledWith(2, {
      windowMs: 60 * 1000,
      max: 60,
      skip: expect.any(Function),
      message: { error: '更新过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false
    })

    expect(dataUpdateLimiter.options.skip()).toBe(false)
    process.env.NODE_ENV = 'test'
    expect(dataUpdateLimiter.options.skip()).toBe(true)
  })
})
