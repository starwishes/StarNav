import { beforeEach, describe, expect, it, vi } from 'vitest'

import { toolController } from '../../../src/server/controllers/toolController.js'
import { toolFaviconService } from '../../../src/server/services/tools/toolFaviconService.js'
import { toolLinkCheckService } from '../../../src/server/services/tools/toolLinkCheckService.js'
import { toolSuggestionService } from '../../../src/server/services/tools/toolSuggestionService.js'

vi.mock('../../../src/server/services/tools/toolFaviconService.js', () => ({
  toolFaviconService: {
    getFavicon: vi.fn()
  }
}))

vi.mock('../../../src/server/services/tools/toolLinkCheckService.js', () => ({
  toolLinkCheckService: {
    checkLinks: vi.fn()
  }
}))

vi.mock('../../../src/server/services/tools/toolSuggestionService.js', () => ({
  toolSuggestionService: {
    getSuggestions: vi.fn()
  }
}))

describe('ToolController Unit Tests', () => {
  let req
  let res

  beforeEach(() => {
    req = {
      query: {},
      body: {}
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
      set: vi.fn()
    }

    vi.clearAllMocks()
  })

  it('should delegate favicon lookups and preserve binary response headers', async () => {
    req.query = { url: 'example.com' }
    const icon = Buffer.from('icon')
    toolFaviconService.getFavicon.mockResolvedValue({
      statusCode: 200,
      body: icon,
      headers: { 'Content-Type': 'image/png' },
      responseType: 'send'
    })

    await toolController.getFavicon(req, res)

    expect(toolFaviconService.getFavicon).toHaveBeenCalledWith('example.com')
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'image/png')
    expect(res.send).toHaveBeenCalledWith(icon)
  })

  it('should delegate link checks to toolLinkCheckService', async () => {
    req.body = { urls: ['https://example.com'] }
    toolLinkCheckService.checkLinks.mockResolvedValue({
      success: true,
      message: 'Success',
      data: {
        results: [{ url: 'https://example.com', status: 'ok' }]
      }
    })

    await toolController.checkLinks(req, res)

    expect(toolLinkCheckService.checkLinks).toHaveBeenCalledWith(['https://example.com'])
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        results: [{ url: 'https://example.com', status: 'ok' }]
      }
    })
  })

  it('should delegate suggestions queries to toolSuggestionService', async () => {
    req.query = { keyword: 'git', type: 'google' }
    toolSuggestionService.getSuggestions.mockResolvedValue({
      success: true,
      message: 'Success',
      data: {
        items: ['github']
      }
    })

    await toolController.getSuggestions(req, res)

    expect(toolSuggestionService.getSuggestions).toHaveBeenCalledWith('git', 'google')
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: {
        items: ['github']
      }
    })
  })
})
