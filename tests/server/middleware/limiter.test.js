import { beforeEach, describe, expect, it, vi } from 'vitest'

const rateLimit = vi.fn((options) => ({ options }))

vi.mock('express-rate-limit', () => ({
  default: rateLimit
}))

const { dataUpdateLimiter, faviconLimiter, healthLimiter, loginLimiter } =
  await import('../../../src/server/middleware/limiter.js')

describe('limiter middleware config', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV
  })

  it('registers the current login limiter configuration', () => {
    expect(rateLimit).toHaveBeenNthCalledWith(1, {
      windowMs: 15 * 60 * 1000,
      max: 10,
      skip: expect.any(Function),
      keyGenerator: expect.any(Function),
      message: { error: '尝试过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false
    })

    expect(loginLimiter.options.skip()).toBe(false)
    process.env.NODE_ENV = 'test'
    expect(loginLimiter.options.skip()).toBe(true)
  })

  it('keys the login limiter by IP plus username to avoid proxy-wide lockouts', () => {
    const { keyGenerator } = loginLimiter.options
    const keyFor = (ip, username) =>
      keyGenerator({ ip, body: username === undefined ? {} : { username } })

    expect(keyFor('203.0.113.7', 'admin')).toBe('203.0.113.7:admin')
    expect(keyFor('203.0.113.7', 'alice')).toBe('203.0.113.7:alice')
    expect(keyFor('203.0.113.7')).toBe('203.0.113.7:')
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

  it('registers public endpoint limiters for favicon and health', () => {
    expect(rateLimit).toHaveBeenNthCalledWith(3, {
      windowMs: 10 * 60 * 1000,
      max: 300,
      skip: expect.any(Function),
      message: { error: '请求过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false
    })
    expect(rateLimit).toHaveBeenNthCalledWith(4, {
      windowMs: 10 * 60 * 1000,
      max: 120,
      skip: expect.any(Function),
      message: { error: '请求过于频繁，请稍后再试' },
      standardHeaders: true,
      legacyHeaders: false
    })

    expect(faviconLimiter.options.skip()).toBe(false)
    expect(healthLimiter.options.skip()).toBe(false)
    process.env.NODE_ENV = 'test'
    expect(faviconLimiter.options.skip()).toBe(true)
    expect(healthLimiter.options.skip()).toBe(true)
  })
})
