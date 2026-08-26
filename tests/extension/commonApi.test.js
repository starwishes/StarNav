import { describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  extractApiErrorMessage,
  getApiField,
  mergeApiPayload,
  readJsonBody,
  unwrapApiPayload
} from '../../clients/extension/common/api.js'

describe('extension common api helpers', () => {
  it('ApiError carries status and payload', () => {
    const error = new ApiError('boom', { status: '404', payload: { code: 'NF' } })
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('boom')
    expect(error.status).toBe(404)
    expect(error.payload).toEqual({ code: 'NF' })
  })

  it('unwrapApiPayload extracts data then content', () => {
    expect(unwrapApiPayload({ data: { a: 1 } })).toEqual({ a: 1 })
    expect(unwrapApiPayload({ content: 'x' })).toBe('x')
    expect(unwrapApiPayload('raw')).toBe('raw')
    expect(unwrapApiPayload(null)).toBe(null)
  })

  it('mergeApiPayload spreads the unwrapped data onto the envelope', () => {
    expect(mergeApiPayload({ success: true, data: { token: 't' } })).toMatchObject({
      success: true,
      token: 't'
    })
    expect(mergeApiPayload('plain')).toEqual({})
  })

  it('getApiField reads top-level or unwrapped fields with a fallback', () => {
    expect(getApiField({ sessions: [1] }, 'sessions', [])).toEqual([1])
    expect(getApiField({ data: { total: 5 } }, 'total', 0)).toBe(5)
    expect(getApiField({ data: 'no' }, 'missing', 'fb')).toBe('fb')
  })

  it('extractApiErrorMessage prefers error then message then status fallback', () => {
    expect(extractApiErrorMessage({ error: 'bad' }, 500)).toBe('bad')
    expect(extractApiErrorMessage({ message: 'nope' }, 500)).toBe('nope')
    expect(extractApiErrorMessage({}, 403)).toBe('HTTP Error 403')
    expect(extractApiErrorMessage({})).toBe('Request failed')
  })

  it('readJsonBody parses the response and falls back on failure', async () => {
    const okResponse = { json: vi.fn().mockResolvedValue({ ok: true }) }
    await expect(readJsonBody(okResponse)).resolves.toEqual({ ok: true })

    const brokenResponse = { json: vi.fn().mockRejectedValue(new Error('parse')) }
    await expect(readJsonBody(brokenResponse, { fallback: 1 })).resolves.toEqual({ fallback: 1 })
  })
})
