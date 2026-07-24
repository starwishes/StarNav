import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
const lookup = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('node:dns/promises', () => ({
  default: {
    lookup
  }
}))

const { toolLinkCheckService } = await import('../../../src/server/services/tools/toolLinkCheckService.js')

describe('ToolLinkCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lookup.mockResolvedValue([{ address: '93.184.216.34' }])
  })

  it('should check links and map failures to error status', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
      .mockRejectedValueOnce(new Error('timeout'))

    const result = await toolLinkCheckService.checkLinks([
      'https://ok.example',
      'https://bad.example',
      'https://timeout.example'
    ])

    expect(result).toEqual({
        results: [
          { url: 'https://ok.example', status: 'ok' },
          { url: 'https://bad.example', status: 'error' },
          { url: 'https://timeout.example', status: 'error' }
        ]
      })
  })

  it('rejects private or oversized link-check payloads before making network requests', async () => {
    await expect(toolLinkCheckService.checkLinks(['http://localhost:8080'])).rejects.toThrow(
      '仅支持检测公网 HTTP/HTTPS 地址'
    )
    await expect(
      toolLinkCheckService.checkLinks(
        Array.from({ length: 21 }, (_, index) => `https://example.com/${index}`)
      )
    ).rejects.toThrow('一次最多检测 20 个链接')

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
