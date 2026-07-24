import { normalizeUrl } from '../utils/url.js'
import { initApi, apiRequest } from '../utils/api.js'
import {
  applyDocumentLanguage,
  applyThemeMode,
  resolveExtensionLanguage,
  resolveExtensionThemeMode
} from '../utils/preferences.js'
import { createBookmarkController } from './modules/bookmarks.js'
import { createCategoryController } from './modules/categories.js'
import { createPopupState, elements, i18n } from './modules/constants.js'
import { createSearchController } from './modules/search.js'
import { getStorage, setStorage } from './modules/storage.js'
import { createUiHelpers, openOptionsPage } from './modules/ui.js'

const state = createPopupState()
window.__STARNAV_POPUP_READY = false

let bookmarkController = null

const ui = createUiHelpers({
  elements,
  state,
  i18n,
  onEdit: (item) => bookmarkController?.handleEdit(item),
  onDelete: (id) => bookmarkController?.handleDelete(id)
})

const searchController = createSearchController({
  apiRequest,
  elements,
  state,
  i18n,
  ui
})

const categoryController = createCategoryController({
  apiRequest,
  elements,
  state,
  i18n,
  ui
})

bookmarkController = createBookmarkController({
  apiRequest,
  normalizeUrl,
  elements,
  state,
  i18n,
  ui,
  loadRecentBookmarks: searchController.loadRecentBookmarks,
  performSearch: searchController.performSearch
})

document.addEventListener('DOMContentLoaded', init)

async function init() {
  const settingsTriggers = new Set(document.querySelectorAll('[data-open-settings]'))
  if (elements.openSettings) {
    settingsTriggers.add(elements.openSettings)
  }

  settingsTriggers.forEach((button) => {
    button.addEventListener('click', openOptionsPage)
  })

  if (elements.i18nToggle) {
    elements.i18nToggle.addEventListener('click', toggleLanguage)
  }

  const stored = await getStorage(['lang', 'locale'])
  state.currentLang = resolveExtensionLanguage(stored)
  applyDocumentLanguage(state.currentLang)
  applyThemeMode(resolveExtensionThemeMode(stored))

  try {
    state.config = await initApi(handleAuthError)
  } catch {
    // Keep the UI responsive even when storage access fails.
  }

  ui.updateUI()

  if (!state.config.serverUrl || !state.config.token) {
    ui.showNotConnected()
    window.__STARNAV_POPUP_READY = true
    return
  }

  ui.showMainContent()
  await categoryController.loadCategories()
  await searchController.loadRecentBookmarks()
  setupEventListeners()
  window.__STARNAV_POPUP_READY = true
}

async function toggleLanguage() {
  state.currentLang = state.currentLang === 'zh' ? 'en' : 'zh'
  applyDocumentLanguage(state.currentLang)
  await setStorage({
    lang: state.currentLang,
    locale: state.currentLang === 'zh' ? 'zh-CN' : 'en-US'
  })
  ui.updateUI()
}

function setupEventListeners() {
  elements.searchInput?.addEventListener('input', searchController.handleSearchInput)
  elements.clearSearch?.addEventListener('click', searchController.clearSearch)
  elements.addCurrentBtn?.addEventListener('click', bookmarkController.showAddForm)
  elements.cancelAdd?.addEventListener('click', ui.hideAddForm)
  elements.submitBookmark?.addEventListener('click', bookmarkController.submitBookmark)
  elements.openSite?.addEventListener('click', () =>
    chrome.tabs.create({ url: state.config.serverUrl })
  )
  elements.addCategoryBtn?.addEventListener('click', categoryController.showCategoryModal)
  elements.closeCategoryModal?.addEventListener('click', categoryController.hideCategoryModal)
  elements.submitCategory?.addEventListener('click', categoryController.createCategory)
}

async function handleAuthError(errorMessage) {
  state.config.token = ''

  await chrome.storage.sync.remove(['token', 'user'])
  await chrome.storage.local.remove(['token', 'user'])

  const reasonKey = errorMessage === '令牌已过期' ? 'tokenExpired' : 'tokenInvalid'
  ui.showNotConnected(reasonKey)
}
