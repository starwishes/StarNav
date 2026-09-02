import {
  buildSearchSuggestionUrl,
  getSearchSuggestionProvider
} from '../../../shared/searchSuggestionProviders.js'
import { logger } from '../../utils/logger.js'

const SUGGESTION_FETCH_TIMEOUT_MS = 3000

/** keyword 长度上限：同时限制进入上游请求 query 的长度 */
const KEYWORD_MAX_LENGTH = 200

const decodeBaiduSuggestionPayload = async (response: Response): Promise<string> => {
  if (typeof response.arrayBuffer === 'function') {
    try {
      const buffer = await response.arrayBuffer()
      return new TextDecoder('gb18030').decode(buffer)
    } catch {
      // Fall through to response.text() so environments without gb18030 support still work.
    }
  }

  return response.text()
}

const extractSuggestionStrings = (value: unknown): string[] => {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    if (value.length > 1 && Array.isArray(value[1])) {
      return extractSuggestionStrings(value[1])
    }

    return value.flatMap((item): string[] => {
      if (typeof item === 'string') {
        return [item]
      }

      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        for (const key of ['phrase', 'query', 'text', 'value', 'suggestion', 'name']) {
          if (typeof record[key] === 'string') {
            return [record[key] as string]
          }
        }

        for (const key of ['items', 'results', 'suggestions', 'data']) {
          const extracted = extractSuggestionStrings(record[key])
          if (extracted.length > 0) {
            return extracted
          }
        }
      }

      return []
    })
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['items', 'results', 'suggestions', 'data']) {
      const extracted = extractSuggestionStrings(record[key])
      if (extracted.length > 0) {
        return extracted
      }
    }
  }

  return []
}

export const toolSuggestionService = {
  async getSuggestions(keyword: string, type = 'baidu') {
    const normalizedKeyword = keyword.trim().slice(0, KEYWORD_MAX_LENGTH)

    if (!normalizedKeyword) {
      return { items: [] as string[] }
    }

    try {
      const provider = getSearchSuggestionProvider(type) || getSearchSuggestionProvider('baidu')
      const url = buildSearchSuggestionUrl(provider?.type, normalizedKeyword)
      if (!provider || !url) {
        return { items: [] as string[] }
      }
      const signal =
        typeof globalThis.AbortSignal?.timeout === 'function'
          ? globalThis.AbortSignal.timeout(SUGGESTION_FETCH_TIMEOUT_MS)
          : undefined
      const response = await fetch(url, signal ? { signal } : undefined)

      // 上游 4xx/5xx 不当作"无建议"静默处理：记录告警并按空结果降级
      if (!response.ok) {
        logger.warn(`搜索建议上游返回异常: ${provider.type} ${response.status}`)
        return { items: [] as string[] }
      }

      if (provider.type === 'baidu') {
        const text = await decodeBaiduSuggestionPayload(response)
        const match = text.match(/s:\[(.*)\]/)
        return {
          items: match ? (JSON.parse(`[${match[1]}]`) as string[]) : []
        }
      }

      const data = await response.json()
      return { items: extractSuggestionStrings(data) }
    } catch (error: unknown) {
      logger.warn('搜索建议获取失败', error instanceof Error ? error : String(error))
      return { items: [] as string[] }
    }
  }
}
