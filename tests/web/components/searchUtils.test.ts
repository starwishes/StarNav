import { describe, expect, it } from 'vitest'

import {
  buildSearchPlaceholder,
  DEFAULT_SEARCH_ENGINES,
  getSuggestionProviderType,
  loadSearchEngineState,
  MAX_SEARCH_ENGINES,
  prepareSearchEngineDraft,
  persistCurrentEngine,
  persistSearchEngines,
  searchLocalBookmarks,
  type SearchEngineOption
} from '@/components/index/searchUtils'

const createStorage = (seed: Record<string, string> = {}) => {
  const store = new Map(Object.entries(seed))

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    }
  }
}

describe('searchUtils', () => {
  it('loads default search engine state for guests', () => {
    const state = loadSearchEngineState(false, createStorage())

    expect(state.searchEngines).toEqual(DEFAULT_SEARCH_ENGINES)
    expect(state.currentEngine).toEqual(DEFAULT_SEARCH_ENGINES[0])
  })

  it('loads persisted search engine state for authenticated users', () => {
    const engines: SearchEngineOption[] = [
      { id: 'duck', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
      { id: 'google', name: 'Google', url: 'https://google.com/search?q=' }
    ]
    const storage = createStorage({
      user_search_engines: JSON.stringify(engines),
      current_search_engine: JSON.stringify(engines[1])
    })

    const state = loadSearchEngineState(true, storage)

    expect(state.searchEngines).toEqual(engines)
    expect(state.currentEngine).toEqual(engines[1])
  })

  it('caps persisted engines at the supported limit and falls back when the current engine is trimmed away', () => {
    const engines = Array.from({ length: MAX_SEARCH_ENGINES + 2 }, (_, index) => ({
      name: `Engine ${index + 1}`,
      url: `https://engine${index + 1}.example.com/?q=`
    }))
    const storage = createStorage({
      user_search_engines: JSON.stringify(engines),
      current_search_engine: JSON.stringify(engines[MAX_SEARCH_ENGINES + 1])
    })

    const state = loadSearchEngineState(true, storage)

    expect(state.searchEngines).toEqual(
      expect.arrayContaining(
        engines.slice(0, MAX_SEARCH_ENGINES).map((engine) => expect.objectContaining(engine))
      )
    )
    expect(state.currentEngine).toEqual(expect.objectContaining(engines[0]))
  })

  it('persists engines and current engine via storage wrappers', () => {
    const storage = createStorage()
    const engine = { id: 'duck', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' }
    const manyEngines = Array.from({ length: MAX_SEARCH_ENGINES + 2 }, (_, index) => ({
      name: `Engine ${index + 1}`,
      url: `https://engine${index + 1}.example.com/?q=`
    }))

    persistSearchEngines(manyEngines, storage)
    persistCurrentEngine(engine, storage)

    expect(JSON.parse(storage.getItem('user_search_engines') || '[]')).toEqual(
      expect.arrayContaining(
        manyEngines
          .slice(0, MAX_SEARCH_ENGINES)
          .map((storedEngine) => expect.objectContaining(storedEngine))
      )
    )
    expect(JSON.parse(storage.getItem('current_search_engine') || '{}')).toEqual(
      expect.objectContaining(engine)
    )

    persistCurrentEngine(null, storage)
    expect(storage.getItem('current_search_engine')).toBeNull()
  })

  it('builds placeholder and suggestion provider from current mode', () => {
    expect(buildSearchPlaceholder('local', DEFAULT_SEARCH_ENGINES[0])).toBe('搜索本地书签...')
    expect(buildSearchPlaceholder('online', { name: 'Google', url: 'https://google.com?q=' })).toBe(
      '在 Google 中搜索...'
    )
    expect(getSuggestionProviderType({ name: 'Google', url: 'https://google.com?q=' })).toBe(
      'google'
    )
    expect(getSuggestionProviderType({ name: '百度', url: 'https://www.baidu.com/s?wd=' })).toBe(
      'baidu'
    )
    expect(getSuggestionProviderType({ name: 'Bing', url: 'https://bing.com?q=' })).toBe('bing')
    expect(
      getSuggestionProviderType({ name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' })
    ).toBe('duckduckgo')
    expect(
      getSuggestionProviderType({ name: 'Brave', url: 'https://search.brave.com/search?q=' })
    ).toBeNull()
    expect(
      getSuggestionProviderType({ name: 'Example', url: 'https://example.com/search?q=' })
    ).toBeNull()
  })

  it('drops persisted engines with unsafe urls and falls back to defaults', () => {
    const storage = createStorage({
      user_search_engines: JSON.stringify([
        { id: 'evil', name: 'Evil', url: 'javascript:alert(1)' },
        { id: 'ok', name: 'DuckDuckGo', url: 'duckduckgo.com/?q=' }
      ]),
      current_search_engine: JSON.stringify({
        id: 'evil',
        name: 'Evil',
        url: 'javascript:alert(1)'
      })
    })

    const state = loadSearchEngineState(true, storage)

    expect(state.searchEngines).toEqual([
      expect.objectContaining({ id: 'ok', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' })
    ])
    expect(state.searchEngines.some((engine) => engine.url.startsWith('javascript'))).toBe(false)
    expect(state.currentEngine).toEqual(state.searchEngines[0])
  })

  it('normalizes and validates custom search engine drafts', () => {
    expect(
      prepareSearchEngineDraft({
        name: '  Google  ',
        url: 'www.google.com/search?q='
      })
    ).toEqual({
      value: {
        name: 'Google',
        url: 'https://www.google.com/search?q='
      }
    })

    expect(
      prepareSearchEngineDraft({
        name: 'Brave',
        url: 'javascript:alert(1)'
      })
    ).toEqual({
      error: '请输入合法的 http/https 搜索地址'
    })

    expect(
      prepareSearchEngineDraft({
        name: 'Brave',
        url: 'https://search.brave.com/search'
      })
    ).toEqual({
      error: '搜索地址需以查询参数赋值结尾，例如 https://www.google.com/search?q='
    })
  })

  it('filters and ranks local search results by visibility and name match', () => {
    const results = searchLocalBookmarks(
      [
        {
          id: 1,
          name: 'GitHub',
          description: 'code hosting',
          url: 'https://github.com',
          categoryId: 1,
          level: 0
        },
        {
          id: 2,
          name: 'Docs',
          description: 'GitHub documentation',
          url: 'https://docs.github.com',
          categoryId: 1,
          level: 0
        },
        {
          id: 3,
          name: 'Hidden GitHub',
          description: 'private',
          url: 'https://hidden.example.com',
          categoryId: 1,
          level: 2
        }
      ],
      'github',
      0
    )

    expect(results.map((item) => item.id)).toEqual([1, 2])
  })
})
