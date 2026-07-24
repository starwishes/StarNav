export function createSearchController({ apiRequest, elements, state, i18n, ui }) {
  const getTexts = () => i18n[state.currentLang]

  const loadRecentBookmarks = async () => {
    try {
      ui.showLoading()

      const result = await apiRequest('/bookmark/search?limit=10')
      const items = Array.isArray(result.items) ? result.items : []

      if (!elements.recentBookmarks) {
        return
      }

      if (items.length === 0) {
        elements.recentBookmarks.innerHTML = `<div class="no-results">${getTexts().noResults}</div>`
        return
      }

      ui.renderBookmarkList(elements.recentBookmarks, items)
    } catch {
      if (elements.recentBookmarks) {
        elements.recentBookmarks.innerHTML = `<div class="no-results">${getTexts().loadFailed}</div>`
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

      if (items.length === 0) {
        elements.searchResults.innerHTML = `<div class="no-results">${getTexts().noMatch}</div>`
        return
      }

      elements.searchResults.innerHTML = `<div class="section-title">${getTexts().searchResult}</div><div class="bookmark-items"></div>`
      ui.renderBookmarkList(elements.searchResults.querySelector('.bookmark-items'), items)
    } catch {
      if (elements.searchResults) {
        elements.searchResults.innerHTML = `<div class="no-results">${getTexts().loadFailed}</div>`
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
