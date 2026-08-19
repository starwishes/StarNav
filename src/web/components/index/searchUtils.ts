import {
  resolveFrontendSearchSuggestionProviderTypeFromUrl,
  type FrontendSearchSuggestionProviderType
} from '../../../shared/searchSuggestionProviders.js'

export interface SearchEngineOption {
  id?: string
  name: string
  url: string
}

export interface SearchableBookmark {
  id: number
  name?: string
  description?: string
  url?: string
  categoryId: number
  level?: number
}

const USER_SEARCH_ENGINES_KEY = 'user_search_engines'
const CURRENT_SEARCH_ENGINE_KEY = 'current_search_engine'
export const MAX_SEARCH_ENGINES = 5

export const DEFAULT_SEARCH_ENGINES: SearchEngineOption[] = [
  { id: 'default-baidu', name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { id: 'default-bing', name: 'Bing', url: 'https://cn.bing.com/search?q=' },
  { id: 'default-google', name: 'Google', url: 'https://www.google.com/search?q=' }
]

type SuggestionProviderType = FrontendSearchSuggestionProviderType
const SEARCH_ENGINE_INPUT_SANITIZE_PATTERN = /[\u200b-\u200d\uFEFF\u0000-\u001F\u007F-\u009F]/g
const SEARCH_ENGINE_URL_SUFFIX_PATTERN = /(?:\?|&)[^=&#]+=$/

let searchEngineIdCounter = 0

const isSearchEngineOption = (value: unknown): value is SearchEngineOption => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.url === 'string' &&
    (candidate.id === undefined || typeof candidate.id === 'string')
  )
}

const safeJsonParse = (value: string | null) => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const sanitizeSearchEngineInput = (value: string) =>
  value.replace(SEARCH_ENGINE_INPUT_SANITIZE_PATTERN, '').trim()

const normalizeSearchEngineUrlInput = (value: string) => {
  let cleanUrl = sanitizeSearchEngineInput(value)
  if (!cleanUrl) {
    return null
  }

  if (!/^https?:\/\//i.test(cleanUrl)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(cleanUrl) || cleanUrl.includes('://')) {
      return null
    }

    cleanUrl = `https://${cleanUrl}`
  }

  try {
    const parsedUrl = new URL(cleanUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null
    }

    parsedUrl.hash = ''
    return parsedUrl.toString()
  } catch {
    return null
  }
}

export const prepareSearchEngineDraft = (draft: Pick<SearchEngineOption, 'name' | 'url'>) => {
  const normalizedName = sanitizeSearchEngineInput(draft.name)
  if (!normalizedName) {
    return {
      error: '请填写完整信息'
    } as const
  }

  const normalizedUrl = normalizeSearchEngineUrlInput(draft.url)
  if (!normalizedUrl) {
    return {
      error: '请输入合法的 http/https 搜索地址'
    } as const
  }

  if (!SEARCH_ENGINE_URL_SUFFIX_PATTERN.test(normalizedUrl)) {
    return {
      error: '搜索地址需以查询参数赋值结尾，例如 https://www.google.com/search?q='
    } as const
  }

  return {
    value: {
      name: normalizedName,
      url: normalizedUrl
    }
  } as const
}

const createSearchEngineId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  searchEngineIdCounter += 1
  return `search-engine-${Date.now()}-${searchEngineIdCounter}`
}

export const normalizeSearchEngine = (engine: SearchEngineOption): SearchEngineOption => ({
  ...engine,
  id: typeof engine.id === 'string' && engine.id ? engine.id : createSearchEngineId()
})

export const isSameSearchEngine = (first: SearchEngineOption, second: SearchEngineOption) =>
  first.id && second.id
    ? first.id === second.id
    : first.name === second.name && first.url === second.url

export const normalizeSearchEngines = (engines: SearchEngineOption[]) =>
  engines.slice(0, MAX_SEARCH_ENGINES).map(normalizeSearchEngine)

export const loadSearchEngineState = (
  isAuthenticated: boolean,
  storage: Pick<Storage, 'getItem'> = localStorage
) => {
  if (!isAuthenticated) {
    return {
      searchEngines: [...DEFAULT_SEARCH_ENGINES],
      currentEngine: DEFAULT_SEARCH_ENGINES[0]
    }
  }

  const parsedEngines = safeJsonParse(storage.getItem(USER_SEARCH_ENGINES_KEY))
  const storedEngines = Array.isArray(parsedEngines)
    ? parsedEngines
        .filter(isSearchEngineOption)
        // Re-run the http(s) guard on persisted values so a tampered
        // `javascript:` engine URL can never flow into window.open(engine.url + ...).
        .map((engine) => ({ ...engine, url: normalizeSearchEngineUrlInput(engine.url) || '' }))
        .filter((engine) => engine.url)
    : []
  const searchEngines =
    storedEngines.length > 0 ? normalizeSearchEngines(storedEngines) : [...DEFAULT_SEARCH_ENGINES]

  const parsedCurrentEngine = safeJsonParse(storage.getItem(CURRENT_SEARCH_ENGINE_KEY))
  const currentEngine = isSearchEngineOption(parsedCurrentEngine)
    ? searchEngines.find((engine) => isSameSearchEngine(engine, parsedCurrentEngine)) ||
      searchEngines[0] ||
      DEFAULT_SEARCH_ENGINES[0]
    : searchEngines[0] || DEFAULT_SEARCH_ENGINES[0]

  return {
    searchEngines,
    currentEngine
  }
}

export const persistSearchEngines = (
  searchEngines: SearchEngineOption[],
  storage: Pick<Storage, 'setItem'> = localStorage
) => {
  storage.setItem(USER_SEARCH_ENGINES_KEY, JSON.stringify(normalizeSearchEngines(searchEngines)))
}

export const persistCurrentEngine = (
  currentEngine: SearchEngineOption | null,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage
) => {
  if (!currentEngine) {
    storage.removeItem(CURRENT_SEARCH_ENGINE_KEY)
    return
  }

  storage.setItem(CURRENT_SEARCH_ENGINE_KEY, JSON.stringify(normalizeSearchEngine(currentEngine)))
}

export const buildSearchPlaceholder = (
  searchMode: 'local' | 'online',
  currentEngine: SearchEngineOption | null
) => {
  return searchMode === 'local'
    ? '搜索本地书签...'
    : `在 ${currentEngine?.name || '搜索引擎'} 中搜索...`
}

export const getSuggestionProviderType = (
  currentEngine: SearchEngineOption | null
): SuggestionProviderType | null => {
  if (!currentEngine?.url) {
    return null
  }

  return resolveFrontendSearchSuggestionProviderTypeFromUrl(currentEngine.url)
}

export const searchLocalBookmarks = (
  items: SearchableBookmark[],
  keyword: string,
  userLevel = 0,
  limit = 8
) => {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return []
  }

  return items
    .filter((item) => {
      if ((item.level ?? 0) > userLevel) {
        return false
      }

      const nameMatch = item.name?.toLowerCase().includes(normalizedKeyword)
      const descMatch = item.description?.toLowerCase().includes(normalizedKeyword)
      const urlMatch = item.url?.toLowerCase().includes(normalizedKeyword)
      return Boolean(nameMatch || descMatch || urlMatch)
    })
    .sort((a, b) => {
      const aScore = a.name?.toLowerCase().includes(normalizedKeyword) ? 3 : 0
      const bScore = b.name?.toLowerCase().includes(normalizedKeyword) ? 3 : 0
      return bScore - aScore
    })
    .slice(0, limit)
}
