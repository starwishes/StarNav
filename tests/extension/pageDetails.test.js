import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { extractActiveTabDetails } from '../../clients/extension/utils/pageDetails.js'

describe('extension pageDetails util', () => {
  let originalChrome
  let originalDocument

  beforeEach(() => {
    originalChrome = globalThis.chrome
    originalDocument = globalThis.document
  })

  afterEach(() => {
    if (originalChrome === undefined) {
      delete globalThis.chrome
    } else {
      globalThis.chrome = originalChrome
    }
    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }
    vi.restoreAllMocks()
  })

  it('returns an empty description when no tab id is provided', async () => {
    await expect(extractActiveTabDetails()).resolves.toEqual({ description: '' })
  })

  it('extracts the meta description via globalThis.chrome.scripting when available', async () => {
    globalThis.chrome = {
      scripting: {
        executeScript: vi.fn().mockResolvedValue([{ result: { description: 'hello' } }])
      }
    }

    await expect(extractActiveTabDetails(7)).resolves.toEqual({ description: 'hello' })

    expect(globalThis.chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      func: expect.any(Function)
    })
  })

  it('falls back to an empty description when scripting returns no results', async () => {
    globalThis.chrome = {
      scripting: {
        executeScript: vi.fn().mockResolvedValue([])
      }
    }

    await expect(extractActiveTabDetails(7)).resolves.toEqual({ description: '' })
  })

  it('uses the tabs.executeScript fallback for older engines', async () => {
    globalThis.chrome = {
      scripting: undefined,
      runtime: {},
      tabs: {
        executeScript: vi.fn((_tabId, _options, callback) => {
          callback([{ description: 'legacy' }])
        })
      }
    }

    await expect(extractActiveTabDetails(9)).resolves.toEqual({ description: 'legacy' })
    expect(globalThis.chrome.tabs.executeScript).toHaveBeenCalled()
  })

  it('rejects when the legacy execution reports a runtime error', async () => {
    globalThis.chrome = {
      scripting: undefined,
      runtime: {
        lastError: { message: 'cannot access page' }
      },
      tabs: {
        executeScript: vi.fn((_tabId, _options, callback) => {
          callback()
        })
      }
    }

    await expect(extractActiveTabDetails(9)).rejects.toThrow('cannot access page')
  })

  it('returns empty when neither scripting nor tabs.executeScript exist', async () => {
    globalThis.chrome = {}

    await expect(extractActiveTabDetails(9)).resolves.toEqual({ description: '' })
  })
})
