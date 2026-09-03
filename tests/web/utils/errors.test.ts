// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { ApiClientError } from '@/api/client'
import { getErrorMessage } from '@/utils/errors'

describe('getErrorMessage (UI-safe error text)', () => {
  it('keeps the business message of ApiClientError (server envelope text)', () => {
    expect(getErrorMessage(new ApiClientError('用户名或密码错误', 401), 'fallback')).toBe(
      '用户名或密码错误'
    )
    // 空 message 回退到调用方 fallback
    expect(getErrorMessage(new ApiClientError('', 500), 'fallback')).toBe('fallback')
  })

  it('does not surface the raw message of network-layer Errors', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'), '加载失败')).toBe('加载失败')
    expect(
      getErrorMessage(new DOMException('The operation was aborted', 'AbortError'), '加载失败')
    ).toBe('加载失败')
    // 普通 Error（可能携带内部堆栈/细节）同样不回显 message
    expect(getErrorMessage(new Error('boom at /srv/starnav/db'), '操作失败')).toBe('操作失败')
  })

  it('surfaces the error/message field of already-resolved failure envelopes', () => {
    expect(getErrorMessage({ success: false, error: '分类名已存在', code: 'CONFLICT' }, 'fb')).toBe(
      '分类名已存在'
    )
    expect(getErrorMessage({ success: false, message: 'server said no' }, 'fb')).toBe(
      'server said no'
    )
  })

  it('passes explicit app-thrown strings through and falls back on empty ones', () => {
    expect(getErrorMessage('cancel', 'fb')).toBe('cancel')
    expect(getErrorMessage('', 'fb')).toBe('fb')
  })

  it('falls back for unknown values', () => {
    expect(getErrorMessage(null, 'fb')).toBe('fb')
    expect(getErrorMessage(undefined, 'fb')).toBe('fb')
    expect(getErrorMessage(42, 'fb')).toBe('fb')
    expect(getErrorMessage({ nested: 'x' }, 'fb')).toBe('fb')
  })
})
