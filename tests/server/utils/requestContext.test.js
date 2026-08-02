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
})
