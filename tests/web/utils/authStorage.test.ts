// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { authStorage } from '@/utils/authStorage'

describe('authStorage', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('round-trips a persisted user hint', () => {
    authStorage.write({ login: 'admin', name: 'admin', level: 3 })

    expect(authStorage.read()).toEqual({ login: 'admin', name: 'admin', level: 3 })

    authStorage.clear()
    expect(authStorage.read()).toBeNull()
  })

  it('returns null for corrupted payloads', () => {
    localStorage.setItem(authStorage.key, '{not-json')

    expect(authStorage.read()).toBeNull()
  })

  it('degrades gracefully when localStorage access is blocked (round 35 G1)', () => {
    // 禁用站点数据/隐私模式下 localStorage 读/写/删均抛 SecurityError；
    // 写失败不应把异常抛给登录主流程（服务端 cookie 已建），清态也不应中断
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access is denied for this document.', 'SecurityError')
    })

    expect(() => authStorage.write({ login: 'admin', name: 'admin', level: 3 })).not.toThrow()
    expect(() => authStorage.clear()).not.toThrow()
    expect(authStorage.read()).toBeNull()
  })
})
