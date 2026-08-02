import { describe, expect, it } from 'vitest'

import {
  ApiError,
  extractApiErrorMessage,
  getApiField,
  mergeApiPayload,
  readJsonBody,
  unwrapApiPayload
} from '../../src/shared/api.js'

describe('shared api helpers', () => {
  it('unwraps API envelopes and reads nested fields consistently', () => {
    const payload = {
      success: true,
      data: {
        item: { id: 1, name: 'GitHub' }
      }
    }

    expect(unwrapApiPayload(payload)).toEqual({ item: { id: 1, name: 'GitHub' } })
    expect(getApiField(payload, 'item', null)).toEqual({ id: 1, name: 'GitHub' })
  })

  it('merges envelope metadata with unwrapped object payloads', () => {
    expect(
      mergeApiPayload({
        success: true,
        message: 'Success',
        data: { token: 'signed-token' }
      })
    ).toEqual({
      success: true,
      message: 'Success',
      data: { token: 'signed-token' },
      token: 'signed-token'
    })
  })

  it('extracts the most useful error message with HTTP fallback', () => {
    expect(extractApiErrorMessage({ error: '令牌已过期' }, 401)).toBe('令牌已过期')
    expect(extractApiErrorMessage({ message: 'Service unavailable' }, 503)).toBe(
      'Service unavailable'
    )
    expect(extractApiErrorMessage({}, 500)).toBe('HTTP Error 500')
  })

  it('supports ApiError payload metadata plus content envelopes', () => {
    const error = new ApiError('Boom', {
      status: 418,
      payload: { ok: false }
    })

    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'Boom',
      status: 418,
      payload: { ok: false }
    })
    expect(unwrapApiPayload({ content: { token: 'signed-token' } })).toEqual({
      token: 'signed-token'
    })
    expect(getApiField({ content: { total: 3 } }, 'total', 0)).toBe(3)
  })

  it('falls back when response json parsing fails', async () => {
    await expect(
      readJsonBody(
        {
          json: async () => {
            throw new Error('invalid json')
          }
        },
        { fallback: true }
      )
    ).resolves.toEqual({ fallback: true })
  })
})
