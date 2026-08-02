import { describe, expect, it } from 'vitest'

import {
  buildSearchSuggestionUrl,
  getSearchSuggestionProvider,
  resolveFrontendSearchSuggestionProviderTypeFromUrl,
  resolveSearchSuggestionProviderTypeFromUrl
} from '../../src/shared/searchSuggestionProviders.js'

describe('searchSuggestionProviders', () => {
  it('resolves provider types from known search engine urls', () => {
    expect(resolveSearchSuggestionProviderTypeFromUrl('https://www.baidu.com/s?wd=star')).toBe(
      'baidu'
    )
    expect(resolveSearchSuggestionProviderTypeFromUrl('https://www.google.com/search?q=star')).toBe(
      'google'
    )
    expect(resolveSearchSuggestionProviderTypeFromUrl('https://cn.bing.com/search?q=star')).toBe(
      'bing'
    )
    expect(resolveSearchSuggestionProviderTypeFromUrl('https://duckduckgo.com/?q=star')).toBe(
      'duckduckgo'
    )
    expect(
      resolveSearchSuggestionProviderTypeFromUrl('https://search.brave.com/search?q=star')
    ).toBe('brave')
    expect(
      resolveSearchSuggestionProviderTypeFromUrl('https://example.com/search?q=star')
    ).toBeNull()
  })

  it('keeps brave out of the frontend-enabled provider list', () => {
    expect(
      resolveFrontendSearchSuggestionProviderTypeFromUrl('https://www.google.com/search?q=star')
    ).toBe('google')
    expect(
      resolveFrontendSearchSuggestionProviderTypeFromUrl('https://search.brave.com/search?q=star')
    ).toBeNull()
  })

  it('builds provider urls from the shared definitions', () => {
    expect(getSearchSuggestionProvider('bing')?.frontendEnabled).toBe(true)
    expect(buildSearchSuggestionUrl('duckduckgo', '星 语')).toBe(
      'https://duckduckgo.com/ac/?q=%E6%98%9F%20%E8%AF%AD&type=list'
    )
    expect(buildSearchSuggestionUrl('unknown', 'star')).toBeNull()
  })
})
