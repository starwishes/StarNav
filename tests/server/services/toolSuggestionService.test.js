import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { toolSuggestionService } = await import('../../../src/server/services/tools/toolSuggestionService.js')

describe('ToolSuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse baidu suggestions', async () => {
    mockFetch.mockResolvedValue({
      text: vi.fn().mockResolvedValue('s:["星语导航","星语导航下载"]')
    })

    const result = await toolSuggestionService.getSuggestions('星语', 'baidu')

    expect(result).toEqual({
        items: ['星语导航', '星语导航下载']
      })
  })

  it('should decode baidu suggestions from gb18030 payloads', async () => {
    mockFetch.mockResolvedValue({
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(Buffer.from('733a5b22c8edbcfe222c22c8edbcfed4b0225d', 'hex'))
    })

    const result = await toolSuggestionService.getSuggestions('软件', 'baidu')

    expect(result).toEqual({
        items: ['软件', '软件园']
      })
  })

  it('should return google suggestions', async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(['git', ['github', 'gitlab']])
    })

    const result = await toolSuggestionService.getSuggestions('git', 'google')

    expect(result).toEqual({
        items: ['github', 'gitlab']
      })
  })

  it('should return bing suggestions from the OpenSearch response format', async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(['chat', ['chatgpt', 'chatgpt login']])
    })

    const result = await toolSuggestionService.getSuggestions('chat', 'bing')

    expect(result).toEqual({
        items: ['chatgpt', 'chatgpt login']
      })
  })

  it('should return duckduckgo suggestions from phrase objects', async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue([{ phrase: 'duckduckgo ai' }, { phrase: 'duckduckgo app' }])
    })

    const result = await toolSuggestionService.getSuggestions('duckduckgo', 'duckduckgo')

    expect(result).toEqual({
        items: ['duckduckgo ai', 'duckduckgo app']
      })
  })

  it('should return brave suggestions when the response is nested under items', async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        items: [{ query: 'brave search' }, { query: 'brave search api' }]
      })
    })

    const result = await toolSuggestionService.getSuggestions('brave', 'brave')

    expect(result).toEqual({
        items: ['brave search', 'brave search api']
      })
  })
})
