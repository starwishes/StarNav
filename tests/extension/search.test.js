/* global document */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSearchController } from '../../clients/extension/popup/modules/search.js'

const i18n = {
  zh: {
    noResults: '暂无书签',
    loadFailed: '加载失败',
    noMatch: '未找到匹配的书签',
    searchResult: '搜索结果'
  }
}

const renderDom = () => {
  document.body.innerHTML = `
    <input id="searchInput" value="" />
    <button id="clearSearch" style="display:none"></button>
    <div id="recentBookmarks"></div>
    <div id="searchResults" style="display:none"></div>
    <div id="bookmarkList" style="display:block"></div>
    <div id="addSection" style="display:block"></div>
  `
}

const getElements = () => ({
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  recentBookmarks: document.getElementById('recentBookmarks'),
  searchResults: document.getElementById('searchResults'),
  bookmarkList: document.getElementById('bookmarkList'),
  addSection: document.getElementById('addSection')
})

describe('browser extension search controller', () => {
  let elements
  let state
  let ui
  let apiRequest
  let controller

  beforeEach(() => {
    vi.useFakeTimers()
    renderDom()
    elements = getElements()
    state = {
      currentLang: 'zh',
      debounceTimer: null
    }
    ui = {
      showLoading: vi.fn(),
      hideLoading: vi.fn(),
      renderBookmarkList: vi.fn(),
      hideSearchResults: vi.fn()
    }
    apiRequest = vi.fn()
    controller = createSearchController({ apiRequest, elements, state, i18n, ui })
  })

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('loads recent bookmarks and renders empty/failure states', async () => {
    apiRequest
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockRejectedValueOnce(new Error('network'))

    await controller.loadRecentBookmarks()
    // Recent list keeps a fixed CSS viewport; no full-page loading overlay on open.
    expect(ui.showLoading).not.toHaveBeenCalled()
    expect(ui.hideLoading).not.toHaveBeenCalled()
    expect(elements.recentBookmarks.innerHTML).toContain('暂无书签')

    await controller.loadRecentBookmarks()
    expect(elements.recentBookmarks.innerHTML).toContain('暂无书签')

    await controller.loadRecentBookmarks()
    expect(elements.recentBookmarks.innerHTML).toContain('加载失败')
    expect(ui.showLoading).not.toHaveBeenCalled()
    expect(ui.hideLoading).not.toHaveBeenCalled()
  })

  it('renders search results and toggles the search layout', async () => {
    apiRequest
      .mockResolvedValueOnce({
        items: [{ id: 1, name: 'GitHub', url: 'https://github.com', categoryName: 'Dev' }]
      })
      .mockResolvedValueOnce({ items: [] })

    await controller.performSearch('git')
    expect(apiRequest).toHaveBeenCalledWith('/bookmark/search?q=git&limit=15')
    expect(elements.bookmarkList.style.display).toBe('none')
    expect(elements.addSection.style.display).toBe('none')
    expect(elements.searchResults.style.display).toBe('block')
    expect(ui.renderBookmarkList).toHaveBeenCalledWith(
      elements.searchResults.querySelector('.bookmark-items'),
      [{ id: 1, name: 'GitHub', url: 'https://github.com', categoryName: 'Dev' }]
    )

    await controller.performSearch('missing')
    expect(elements.searchResults.innerHTML).toContain('未找到匹配的书签')
  })

  it('debounces search input and clears the active search state', async () => {
    apiRequest.mockResolvedValue({ items: [] })

    controller.handleSearchInput({ target: { value: 'git' } })
    expect(elements.clearSearch.style.display).toBe('block')
    expect(apiRequest).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(apiRequest).toHaveBeenCalledWith('/bookmark/search?q=git&limit=15')

    controller.handleSearchInput({ target: { value: '' } })
    await vi.advanceTimersByTimeAsync(300)
    expect(ui.hideSearchResults).toHaveBeenCalledTimes(1)

    elements.searchInput.value = 'query'
    controller.clearSearch()
    expect(elements.searchInput.value).toBe('')
    expect(elements.clearSearch.style.display).toBe('none')
    expect(ui.hideSearchResults).toHaveBeenCalledTimes(2)
  })
})
