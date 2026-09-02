// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const lookup = vi.fn()
const mockRequest = vi.fn()
const pendingRequests = []

const createFakeReq = () => {
  const handlers = {}
  const req = {
    on(event, handler) {
      handlers[event] = handler
      return req
    },
    destroy(error) {
      handlers.error?.(error)
    },
    trigger(event) {
      handlers[event]?.()
    }
  }
  return req
}

const requestImpl = (url, options, callback) => {
  mockRequest(url, options, callback)
  const req = createFakeReq()
  const href = String(url?.href || url)
  if (href.includes('ok.example')) {
    callback({ statusCode: 200, resume: vi.fn() })
  } else if (href.includes('bad.example')) {
    callback({ statusCode: 404, resume: vi.fn() })
  } else {
    pendingRequests.push(req)
  }
  return req
}

vi.mock('node:dns/promises', () => ({
  default: {
    lookup
  }
}))

vi.mock('node:https', () => ({
  default: {
    request: requestImpl
  }
}))

vi.mock('node:http', () => ({
  default: {
    request: requestImpl
  }
}))

const { toolLinkCheckService } =
  await import('../../../src/server/services/tools/toolLinkCheckService.js')

describe('ToolLinkCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pendingRequests.length = 0
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })

  it('should check links against the pinned resolved IP and map failures to error status', async () => {
    const resultPromise = toolLinkCheckService.checkLinks([
      'https://ok.example',
      'https://bad.example',
      'https://timeout.example'
    ])

    // Let the per-URL microtasks schedule the HEAD requests.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(pendingRequests).toHaveLength(1)
    pendingRequests[0].trigger('timeout')

    const result = await resultPromise

    expect(result).toEqual({
      results: [
        { url: 'https://ok.example', status: 'ok' },
        { url: 'https://bad.example', status: 'error' },
        { url: 'https://timeout.example', status: 'error' }
      ]
    })
  })

  it('pins the request to the validated address via the custom lookup option', async () => {
    const resultPromise = toolLinkCheckService.checkLinks(['https://ok.example'])

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockRequest).toHaveBeenCalledTimes(1)
    const [, options] = mockRequest.mock.calls[0]
    expect(options.agent).toBe(false)
    expect(options.method).toBe('HEAD')

    const lookupFn = options.lookup
    expect(lookupFn).toBeTypeOf('function')
    const callback = vi.fn()
    lookupFn('ok.example', {}, callback)
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4)

    await resultPromise
  })

  it('flags private targets as per-URL errors and rejects oversized payloads before network requests', async () => {
    const result = await toolLinkCheckService.checkLinks(['http://localhost:8080'])

    // 单条非法 URL 不再拖垮整批：按逐条语义标记为 error
    expect(result).toEqual({
      results: [{ url: 'http://localhost:8080', status: 'error' }]
    })

    await expect(
      toolLinkCheckService.checkLinks(
        Array.from({ length: 21 }, (_, index) => `https://example.com/${index}`)
      )
    ).rejects.toThrow('一次最多检测 20 个链接')

    expect(mockRequest).not.toHaveBeenCalled()
  })
})
