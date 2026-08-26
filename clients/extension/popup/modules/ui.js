import { escapeHtml } from '../../utils/dom.js'

// Only http(s) links are safe to open from a rendered anchor; schemes such as
// javascript: must never become executable hrefs.
const isSafeHttpUrl = (url) => {
  try {
    const parsed = new URL(String(url))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const setDisplay = (element, value) => {
  if (element) {
    element.style.display = value
  }
}

export function createUiHelpers({ elements, state, i18n, onEdit, onDelete }) {
  let toastTimer = null

  const getTexts = () => i18n[state.currentLang]

  const showToast = (message, type = 'info') => {
    if (!elements.toast) {
      return
    }

    elements.toast.textContent = message
    elements.toast.className = `toast ${type}`
    setDisplay(elements.toast, 'block')

    if (toastTimer) {
      window.clearTimeout(toastTimer)
    }

    toastTimer = window.setTimeout(() => {
      setDisplay(elements.toast, 'none')
    }, 3000)
  }

  const updateUI = () => {
    const texts = getTexts()

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n')
      if (!key || !texts[key]) {
        return
      }

      element.textContent = texts[key]
    })

    if (elements.openSite) {
      elements.openSite.title = texts.openSite
    }

    if (elements.themeToggle) {
      elements.themeToggle.title = texts.toggleTheme
    }

    if (elements.i18nToggle) {
      elements.i18nToggle.title = texts.toggleLang

      const main = elements.i18nToggle.querySelector('.main-char')
      const badge = elements.i18nToggle.querySelector('.badge-char')
      if (main && badge) {
        main.textContent = state.currentLang === 'zh' ? '文' : 'A'
        badge.textContent = state.currentLang === 'zh' ? 'A' : '文'
      }
    }

    if (elements.addCategoryBtn) {
      elements.addCategoryBtn.title = texts.newCatTip
    }

    if (elements.searchInput) {
      elements.searchInput.placeholder = texts.searchPlaceholder
    }

    if (elements.bookmarkDesc) {
      elements.bookmarkDesc.placeholder = texts.descPlaceholder
    }

    if (elements.newCategoryName) {
      elements.newCategoryName.placeholder = texts.catPlaceholder
    }
  }

  const showNotConnected = (reasonKey, mode = 'setup') => {
    const texts = getTexts()
    const message = reasonKey && texts[reasonKey] ? texts[reasonKey] : texts.connectTip

    showToast(message, 'error')

    if (!elements.notConnected) {
      return
    }

    setDisplay(elements.notConnected, 'flex')
    setDisplay(elements.mainContent, 'none')

    // 单一连接卡片:首次连接(空白)与会话过期(预填)共用同一表单,
    // 仅标题与提示随模式切换。
    if (elements.connectCard) {
      const title = elements.connectCard.querySelector('.not-connected-title')
      const tip = elements.connectCard.querySelector('.not-connected-copy')
      if (title) {
        title.textContent = mode === 'reconnect' ? texts.reconnectTitle : texts.connectTitle
      }
      if (tip) {
        tip.textContent = mode === 'reconnect' ? texts.reconnectTip : texts.connectTip
      }
    }
  }

  const showMainContent = () => {
    setDisplay(elements.notConnected, 'none')
    setDisplay(elements.mainContent, 'block')
  }

  const showLoading = () => {
    setDisplay(elements.loading, 'flex')
  }

  const hideLoading = () => {
    setDisplay(elements.loading, 'none')
  }

  const hideSearchResults = () => {
    setDisplay(elements.searchResults, 'none')
    setDisplay(elements.bookmarkList, 'block')
    setDisplay(elements.addSection, 'block')
  }

  const hideAddForm = () => {
    setDisplay(elements.addForm, 'none')
    setDisplay(elements.addSection, 'block')
    setDisplay(elements.duplicateWarning, 'none')

    if (elements.searchInput && elements.searchInput.value.trim()) {
      setDisplay(elements.searchResults, 'block')
      setDisplay(elements.bookmarkList, 'none')
    } else {
      setDisplay(elements.bookmarkList, 'block')
      setDisplay(elements.searchResults, 'none')
    }

    state.currentEditingId = null
  }

  const renderBookmarkList = (container, items) => {
    if (!container) {
      return
    }

    const texts = getTexts()

    container.innerHTML = items
      .map(
        (item) => `
      <div class="bookmark-item-wrapper">
        <a href="${isSafeHttpUrl(item.url) ? escapeHtml(item.url) : '#'}" class="bookmark-item" target="_blank" rel="noopener">
          <div class="bookmark-icon">${(item.name || '?').charAt(0).toUpperCase()}</div>
          <div class="bookmark-info">
            <div class="bookmark-name">${escapeHtml(item.name)}</div>
            <div class="bookmark-url">${escapeHtml(item.url)}</div>
          </div>
          <span class="bookmark-category">${escapeHtml(item.categoryName || '')}</span>
        </a>
        <div class="item-actions">
          <button class="icon-btn edit-btn" data-id="${item.id}" title="${texts.edit}">✎</button>
          <button class="icon-btn delete-btn" data-id="${item.id}" title="${texts.delete}">🗑️</button>
        </div>
      </div>
    `
      )
      .join('')

    container.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        onEdit(items.find((item) => String(item.id) === button.dataset.id))
      })
    })

    container.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        onDelete(button.dataset.id)
      })
    })
  }

  return {
    updateUI,
    showNotConnected,
    showMainContent,
    showLoading,
    hideLoading,
    showToast,
    hideSearchResults,
    hideAddForm,
    renderBookmarkList
  }
}
