import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

const loadApiModule = async () => {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch)
  return import('../../../src/web/api/index.ts')
}

const createJsonResponse = (payload: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
  headers: new Headers()
})

describe('frontend data/public/tool apis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockFetch.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('unwraps full content payloads from the data api', async () => {
    mockFetch.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          categories: [{ id: 1, name: 'Dev' }],
          items: [{ id: 10, name: 'GitHub', url: 'https://github.com' }]
        }
      })
    )

    const { dataApi } = await loadApiModule()

    await expect(dataApi.getContent()).resolves.toEqual({
      categories: [{ id: 1, name: 'Dev' }],
      items: [{ id: 10, name: 'GitHub', url: 'https://github.com' }]
    })
  })

  it('reads mutation items from both nested and top-level payloads', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            item: {
              id: 11,
              name: 'Created',
              url: 'https://created.test'
            }
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          item: {
            id: 3,
            name: 'Updated Category'
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            categories: [{ id: 3 }, { id: 1 }]
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            item: {
              id: 11,
              categoryId: 3
            }
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            items: [{ id: 11, categoryId: 3 }],
            count: 1
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            count: 1
          }
        })
      )

    const { dataApi } = await loadApiModule()

    await expect(
      dataApi.addItem({
        name: 'Created',
        url: 'https://created.test'
      })
    ).resolves.toEqual({
      id: 11,
      name: 'Created',
      url: 'https://created.test'
    })
    await expect(dataApi.updateCategory(3, { name: 'Updated Category' })).resolves.toEqual({
      id: 3,
      name: 'Updated Category'
    })
    await expect(dataApi.reorderCategories([3, 1])).resolves.toEqual([{ id: 3 }, { id: 1 }])
    await expect(dataApi.moveItem(11, { categoryId: 3, targetIndex: 0 })).resolves.toEqual({
      id: 11,
      categoryId: 3
    })
    await expect(dataApi.batchMoveItems([11], 3)).resolves.toEqual([{ id: 11, categoryId: 3 }])
    await expect(dataApi.batchDeleteItems([11])).resolves.toBe(1)
  })

  it('wraps suggestion, link check, and public settings endpoints consistently', async () => {
    mockFetch
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            items: ['star', 'starnav']
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            results: [{ url: 'https://example.com', status: 'ok' }]
          }
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            siteName: 'StarNav'
          }
        })
      )

    const { publicApi, toolApi } = await loadApiModule()

    await expect(toolApi.getSuggestions('星 语', 'baidu')).resolves.toEqual(['star', 'starnav'])
    await expect(toolApi.checkLinks(['https://example.com'])).resolves.toEqual([
      { url: 'https://example.com', status: 'ok' }
    ])
    await expect(publicApi.getSettings()).resolves.toEqual({ siteName: 'StarNav' })

    expect(mockFetch.mock.calls[0][0]).toBe('/api/suggest?keyword=%E6%98%9F%20%E8%AF%AD&type=baidu')
    expect(mockFetch.mock.calls[1][0]).toBe('/api/check-links')
    expect(mockFetch.mock.calls[2][0]).toBe('/api/settings')
  })
})
