import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { toolFaviconService } = await import('../../../src/server/services/tools/toolFaviconService.js')

const buildBinaryResponse = (contentType = 'image/png', size = 128) => ({
  ok: true,
  headers: {
    get: vi.fn().mockReturnValue(contentType)
  },
  arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array(size).buffer)
})

describe('ToolFaviconService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and cache favicon responses', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/png'))

    const first = await toolFaviconService.getFavicon('example.com')
    const second = await toolFaviconService.getFavicon('example.com')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(first).toEqual({
      statusCode: 200,
      body: expect.any(Buffer),
      headers: { 'Content-Type': 'image/png' },
      responseType: 'send'
    })
    expect(second).toEqual({
      statusCode: 200,
      body: expect.any(Buffer),
      headers: { 'Content-Type': 'image/png' },
      responseType: 'send'
    })
  })

  it('should return a 404 payload when favicon lookup fails', async () => {
    mockFetch.mockRejectedValue(new Error('network'))

    const result = await toolFaviconService.getFavicon('missing.example')

    expect(result).toEqual({
      statusCode: 404,
      body: { error: 'Not found' }
    })
  })
})
