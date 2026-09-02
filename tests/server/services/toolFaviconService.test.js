// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { toolFaviconService } =
  await import('../../../src/server/services/tools/toolFaviconService.js')

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

  it('should fall back to image/x-icon when the upstream content-type is not an image', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('text/html; charset=utf-8'))

    const result = await toolFaviconService.getFavicon('ct-html.example')

    expect(result).toEqual({
      statusCode: 200,
      body: expect.any(Buffer),
      headers: { 'Content-Type': 'image/x-icon' },
      responseType: 'send'
    })
  })

  it('should pass through upstream image/* content types unchanged', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/png'))

    const result = await toolFaviconService.getFavicon('ct-image.example')

    expect(result.headers).toEqual({ 'Content-Type': 'image/png' })
  })

  it('should pass through content-type parameters for allowed image types', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/png; charset=binary'))

    const result = await toolFaviconService.getFavicon('ct-params.example')

    expect(result.headers).toEqual({ 'Content-Type': 'image/png; charset=binary' })
  })

  it.each([
    ['image/jpeg', 'ct-bmp-jpeg.example'],
    ['image/webp', 'ct-bmp-webp.example'],
    ['image/gif', 'ct-bmp-gif.example'],
    ['image/x-icon', 'ct-bmp-ico.example'],
    ['image/vnd.microsoft.icon', 'ct-bmp-msico.example']
  ])('should pass through allowed bitmap type %s unchanged', async (contentType, hostname) => {
    mockFetch.mockResolvedValue(buildBinaryResponse(contentType))

    const result = await toolFaviconService.getFavicon(hostname)

    expect(result.headers).toEqual({ 'Content-Type': contentType })
  })

  it.each([
    ['image/svg+xml', 'ct-svg-1.example'],
    ['IMAGE/SVG+XML', 'ct-svg-2.example'],
    ['image/svg+xml; charset=utf-8', 'ct-svg-3.example']
  ])(
    'should fall back to image/x-icon for svg content-type %s',
    async (rawContentType, hostname) => {
      mockFetch.mockResolvedValue(buildBinaryResponse(rawContentType))

      const result = await toolFaviconService.getFavicon(hostname)

      expect(result.headers).toEqual({ 'Content-Type': 'image/x-icon' })
    }
  )

  it('should URL-encode hostnames that contain query separators before building upstream URLs', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/x-icon'))

    const result = await toolFaviconService.getFavicon('https://exa&mple.com')

    expect(result.statusCode).toBe(200)
    const urls = mockFetch.mock.calls.map(([url]) => url)
    expect(urls[0]).toContain('domain=exa%26mple.com')
    expect(urls[0]).not.toContain('domain=exa&')
    expect(urls[1]).toContain('ip3/exa%26mple.com.ico')
  })

  it('should normalize hosts with ports, credentials, and case before fetching', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/x-icon'))

    const result = await toolFaviconService.getFavicon(
      'https://user:pass@CaseHost.example:8443/sub?q=1'
    )

    expect(result.statusCode).toBe(200)
    const urls = mockFetch.mock.calls.map(([url]) => url)
    expect(urls[0]).toContain('domain=casehost.example')
    expect(urls[1]).toContain('ip3/casehost.example')
  })

  it('should return a 404 payload for malformed hosts', async () => {
    const result = await toolFaviconService.getFavicon('http://[::1')

    expect(result).toEqual({
      statusCode: 404,
      body: { error: 'Not found' }
    })
  })

  it('should deduplicate concurrent same-hostname fetches into one upstream round trip', async () => {
    mockFetch.mockResolvedValue(buildBinaryResponse('image/png'))

    const [first, second] = await Promise.all([
      toolFaviconService.getFavicon('dedupe.example'),
      toolFaviconService.getFavicon('dedupe.example')
    ])

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
