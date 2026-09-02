// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  buildRequestContext,
  getClientIP,
  getUserAgent
} from '../../../src/server/utils/requestContext.js'

describe('requestContext utils', () => {
  it('prefers req.ip and falls back through socket metadata', () => {
    expect(
      getClientIP({
        headers: {
          'x-forwarded-for': '10.0.0.1, 10.0.0.2'
        },
        connection: {
          remoteAddress: '127.0.0.1'
        },
        ip: '127.0.0.2'
      })
    ).toBe('127.0.0.2')

    expect(
      getClientIP({
        headers: {},
        socket: {
          remoteAddress: '127.0.0.2'
        },
        connection: {
          remoteAddress: '127.0.0.1'
        }
      })
    ).toBe('127.0.0.2')

    expect(
      getClientIP({
        headers: {},
        connection: null,
        ip: '127.0.0.2'
      })
    ).toBe('127.0.0.2')
  })

  it('builds a request context with normalized fallbacks', () => {
    expect(
      buildRequestContext({
        headers: {
          'user-agent': 'Vitest Browser'
        },
        connection: {
          remoteAddress: '127.0.0.1'
        }
      })
    ).toEqual({
      ip: '127.0.0.1',
      userAgent: 'Vitest Browser'
    })

    expect(getUserAgent({ headers: {} })).toBe('unknown')
  })

  it('truncates user-agents longer than 256 characters before they reach storage', () => {
    const longUA = 'Mozilla/5.0 ' + 'A'.repeat(500)

    expect(getUserAgent({ headers: { 'user-agent': longUA } })).toBe(
      'Mozilla/5.0 ' + 'A'.repeat(256 - 'Mozilla/5.0 '.length)
    )

    // 数组形式的 UA 头（代理合并多值）取首值并同样截断
    const arrayUA = ['B'.repeat(400), 'ignored']
    expect(getUserAgent({ headers: { 'user-agent': arrayUA } })).toBe('B'.repeat(256))

    // 未超限时原样保留
    const normalUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0'
    expect(getUserAgent({ headers: { 'user-agent': normalUA } })).toBe(normalUA)
  })
})
