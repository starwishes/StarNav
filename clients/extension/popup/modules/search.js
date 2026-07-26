const visitTimestamp = (item) => {
  const raw = item?.lastVisited || item?.last_visited || item?.updatedAt || item?.createdAt || ''
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

const sortByRecentVisit = (items) =>
  [...items].sort((left, right) => visitTimestamp(right) - visitTimestamp(left))

export function createSearchController({ apiRequest, elements, state, i18n, ui }) {
  const getTexts = () => i18n[state.currentLang]

  const loadRecentBookmarks = async () => {
    try {
      ui.showLoading()

      const result = await apiRequest('/bookmark/search?limit=20')
      const items = sortByRecentVisit(Array.isArray(result.items) ? result.items : []).slice(0, 10)

      if (!elements.recentBookmarks) {
        return
      }

      if (items.length === 0) {
        elements.recentBookmarks.textContent = ''
        const empty = document.createElement('div')
        empty.className = 'no-results'
        empty.textContent = getTexts().noResults
        elements.recentBookmarks.appendChild(empty)
        return
      }

      ui.renderBookmarkList(elements.recentBookmarks, items)
    } catch {
      if (elements.recentBookmarks) {
        elements.recentBookmarks.textContent = ''
        const failed = document.createElement('div')
        failed.className = 'no-results'
        failed.textContent = getTexts().loadFailed
        elements.recentBookmarks.appendChild(failed)
      }
    } finally {
      ui.hideLoading()
    }
  }

  const performSearch = async (query) => {
    try {
      const result = await apiRequest(`/bookmark/search?q=${encodeURIComponent(query)}&limit=15`)
      const items = Array.isArray(result.items) ? result.items : []

      if (!elements.searchResults) {
        return
      }

      elements.bookmarkList.style.display = 'none'
      elements.addSection.style.display = 'none'
      elements.searchResults.style.display = 'block'
      elements.searchResults.textContent = ''

      if (items.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'no-results'
        empty.textContent = getTexts().noMatch
        elements.searchResults.appendChild(empty)
        return
      }

      const title = document.createElement('div')
      title.className = 'section-title'
      title.textContent = getTexts().searchResult
      const list = document.createElement('div')
      list.className = 'bookmark-items'
      elements.searchResults.append(title, list)
      ui.renderBookmarkList(list, items)
    } catch {
      if (elements.searchResults) {
        elements.searchResults.textContent = ''
        const failed = document.createElement('div')
        failed.className = 'no-results'
        failed.textContent = getTexts().loadFailed
        elements.searchResults.appendChild(failed)
      }
    }
  }

  const handleSearchInput = (event) => {
    const query = event.target.value.trim()

    if (elements.clearSearch) {
      elements.clearSearch.style.display = query ? 'block' : 'none'
    }

    if (state.debounceTimer) {
      window.clearTimeout(state.debounceTimer)
    }

    state.debounceTimer = window.setTimeout(() => {
      if (query) {
        performSearch(query)
        return
      }

      ui.hideSearchResults()
    }, 300)
  }

  const clearSearch = () => {
    if (elements.searchInput) {
      elements.searchInput.value = ''
    }

    if (elements.clearSearch) {
      elements.clearSearch.style.display = 'none'
    }

    ui.hideSearchResults()
  }

  return {
    loadRecentBookmarks,
    performSearch,
    handleSearchInput,
    clearSearch
  }
}
