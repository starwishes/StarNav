// 服务端日期存在两种格式：ISO T 形（`YYYY-MM-DDTHH:MM:SS.sssZ`）与历史库空格形
// （`YYYY-MM-DD HH:MM:SS`，无时区标记但实际是 UTC，第 4 轮前 datetime('now') 写入）。
// 空格形不补 Z 会被 Date.parse 按本地时区解析（Chrome/FF 实现相关），新旧行混排时
// "最近访问"排序可偏移至多一个时区差——与 Web 侧 parseDateString（src/web/utils/datetime.ts）
// 同族问题，扩展此前漏网（第 24 轮）。
const visitTimestamp = (item) => {
  const raw = item?.lastVisited || item?.updatedAt || item?.createdAt || ''
  const normalized =
    typeof raw === 'string'
      ? raw.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2Z')
      : raw
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const sortByRecentVisit = (items) =>
  [...items].sort((left, right) => visitTimestamp(right) - visitTimestamp(left))

export function createSearchController({ apiRequest, elements, state, i18n, ui }) {
  const getTexts = () => i18n[state.currentLang]

  // 乱序响应防护：连续输入时旧请求可能晚于新请求返回，序号作废旧响应（含旧错误）
  //（Web 端 useSearchExecution 有 requestId+AbortController，扩展端此前漏网，第 32 轮 Pi L2）
  let searchRequestSeq = 0

  const loadRecentBookmarks = async () => {
    // Do not use full-page loading overlay here: popup CSS reserves a fixed list
    // viewport so open→fetch must not resize the shell (layout jump).
    try {
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
    }
  }

  const performSearch = async (query) => {
    const requestId = ++searchRequestSeq
    try {
      const result = await apiRequest(`/bookmark/search?q=${encodeURIComponent(query)}&limit=15`)
      const items = Array.isArray(result.items) ? result.items : []

      if (requestId !== searchRequestSeq) {
        // 旧响应晚到：已被更新的搜索/清空取代，丢弃
        return
      }

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
      if (requestId !== searchRequestSeq) {
        return
      }
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
    // 先取消挂起的 debounce 定时器，避免陈旧搜索在清除后仍触发弹回搜索视图
    if (state.debounceTimer) {
      window.clearTimeout(state.debounceTimer)
      state.debounceTimer = null
    }

    // 作废任何在途搜索响应，防止清空后旧结果覆盖视图
    searchRequestSeq++

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
