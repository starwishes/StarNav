import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ensureHostPermission,
  originPatternFromServerUrl
} from '../../clients/extension/utils/permissions.js'

describe('extension permissions util', () => {
  let originalChrome

  beforeEach(() => {
    originalChrome = globalThis.chrome
    globalThis.chrome = undefined
    delete globalThis.chrome
  })

  afterEach(() => {
    if (originalChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = originalChrome
    }
    vi.restoreAllMocks()
  })

  it('derives an origin wildcard pattern from the server url', () => {
    expect(originPatternFromServerUrl('https://nav.example.com')).toBe('https://nav.example.com/*')
  })

  it('returns an empty pattern for urls without an http(s) scheme', () => {
    expect(originPatternFromServerUrl('nav.example.com')).toBe('')
  })

  it('returns an empty pattern for invalid server urls', () => {
    expect(originPatternFromServerUrl('')).toBe('')
    expect(originPatternFromServerUrl('not a url')).toBe('')
  })

  it('returns false when no origin pattern can be built', async () => {
    await expect(ensureHostPermission('')).resolves.toBe(false)
  })

  it('returns true when the permissions API is unavailable', async () => {
    await expect(ensureHostPermission('https://nav.example.com')).resolves.toBe(true)
  })

  it('skips requesting when the origin is already granted', async () => {
    globalThis.chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(true),
        request: vi.fn()
      }
    }

    await expect(ensureHostPermission('https://nav.example.com')).resolves.toBe(true)
    expect(globalThis.chrome.permissions.request).not.toHaveBeenCalled()
  })

  it('requests the origin when not yet granted', async () => {
    globalThis.chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(false),
        request: vi.fn().mockResolvedValue(true)
      }
    }

    await expect(ensureHostPermission('https://nav.example.com')).resolves.toBe(true)
    expect(globalThis.chrome.permissions.request).toHaveBeenCalledWith({
      origins: ['https://nav.example.com/*']
    })
  })

  it('falls back to requesting when contains() throws', async () => {
    globalThis.chrome = {
      permissions: {
        contains: vi.fn().mockRejectedValue(new Error('nope')),
        request: vi.fn().mockResolvedValue(true)
      }
    }

    await expect(ensureHostPermission('https://nav.example.com')).resolves.toBe(true)
  })

  it('returns false when the permission request is rejected', async () => {
    globalThis.chrome = {
      permissions: {
        contains: vi.fn().mockResolvedValue(false),
        request: vi.fn().mockRejectedValue(new Error('denied'))
      }
    }

    await expect(ensureHostPermission('https://nav.example.com')).resolves.toBe(false)
  })
})
