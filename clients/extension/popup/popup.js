import { normalizeUrl } from '../utils/url.js'
import { initApi, apiRequest, loginToServer, normalizeServerUrl } from '../utils/api.js'
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
import { getMergedStorage, removeStorage, setStorage } from './modules/storage.js'
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

async function clearPendingCaptureBadge() {
  try {
    await chrome.action?.setBadgeText?.({ text: '' })
  } catch {
    // Optional.
  }
  try {
    await chrome.browserAction?.setBadgeText?.({ text: '' })
  } catch {
    // Optional.
  }
}

async function consumePendingCapture() {
  const stored = await getMergedStorage(['pendingCapture'])
  const capture = stored.pendingCapture
  if (!capture?.url) {
    return null
  }

  await removeStorage(['pendingCapture'], 'local')
  await clearPendingCaptureBadge()
  return capture
}

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

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme)
  }

  const stored = await getMergedStorage(['lang', 'locale', 'themeMode', 'theme-mode'])
  state.currentLang = resolveExtensionLanguage(stored)
  state.currentThemeMode = resolveExtensionThemeMode(stored)
  applyDocumentLanguage(state.currentLang)
  applyThemeMode(state.currentThemeMode)

  try {
    state.config = await initApi(handleAuthError)
  } catch {
    // Keep the UI responsive even when storage access fails.
  }

  ui.updateUI()

  if (!state.config.serverUrl || !state.config.token) {
    // 已有服务器+用户名但 token 缺失/失效 → 显示内联重连卡片,
    // 避免每次都要打开 options 页。token 校验在后续 API 调用时由 server 端拒绝。
    const stored = await getMergedStorage(['serverUrl', 'savedUsername', 'rememberLogin'])
    const serverUrl = normalizeServerUrl(stored.serverUrl || state.config.serverUrl)
    const savedUsername = stored.savedUsername || ''
    if (serverUrl && savedUsername && elements.reconnectUsername) {
      elements.reconnectUsername.value = savedUsername
      if (elements.reconnectPassword) elements.reconnectPassword.value = ''
      if (elements.reconnectRemember) {
        elements.reconnectRemember.checked = stored.rememberLogin === true
      }
      ui.showNotConnected('tokenExpired', 'reconnect')
      setTimeout(() => elements.reconnectPassword?.focus(), 0)
    } else {
      ui.showNotConnected()
    }
    setupEventListeners()
    window.__STARNAV_POPUP_READY = true
    return
  }

  ui.showMainContent()
  await categoryController.loadCategories()
  await searchController.loadRecentBookmarks()
  setupEventListeners()

  const pendingCapture = await consumePendingCapture()
  if (pendingCapture) {
    await bookmarkController.showAddFormFromCapture(pendingCapture)
  }

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

async function toggleTheme() {
  state.currentThemeMode = state.currentThemeMode === 'dark' ? 'light' : 'dark'
  applyThemeMode(state.currentThemeMode)
  await setStorage({ themeMode: state.currentThemeMode })
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
  elements.reconnectBtn?.addEventListener('click', handleReconnect)
  elements.reconnectPassword?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleReconnect()
    }
  })
}

async function handleAuthError(errorMessage) {
  state.config.token = ''

  // Keep savedUsername for reconnect; only clear auth secrets.
  await removeStorage(['token', 'user'], 'local')
  await removeStorage(['token', 'user'], 'sync')

  const reasonKey =
    errorMessage === '令牌已过期' || /expired/i.test(String(errorMessage || ''))
      ? 'tokenExpired'
      : 'tokenInvalid'

  // 如果已配置过服务器且保存了用户名,直接在内联重连卡片里让用户重新输入密码,
  // 避免每次会话失效都要打开 options 页。
  const stored = await getMergedStorage(['serverUrl', 'savedUsername', 'rememberLogin'])
  const serverUrl = normalizeServerUrl(stored.serverUrl || state.config.serverUrl)
  const savedUsername = stored.savedUsername || ''
  if (serverUrl && savedUsername && elements.reconnectUsername) {
    elements.reconnectUsername.value = savedUsername
    if (elements.reconnectPassword) {
      elements.reconnectPassword.value = ''
    }
    if (elements.reconnectRemember) {
      elements.reconnectRemember.checked = stored.rememberLogin === true
    }
    ui.showNotConnected(reasonKey, 'reconnect')
    // 聚焦密码框,Enter 提交
    setTimeout(() => elements.reconnectPassword?.focus(), 0)
    return
  }

  ui.showNotConnected(reasonKey)
}

async function handleReconnect() {
  const stored = await getMergedStorage(['serverUrl'])
  const serverUrl = normalizeServerUrl(stored.serverUrl || state.config.serverUrl)
  const username = elements.reconnectUsername?.value.trim() || ''
  const password = elements.reconnectPassword?.value || ''
  const remember = elements.reconnectRemember?.checked === true

  if (!serverUrl) {
    openOptionsPage()
    return
  }
  if (!username || !password) {
    ui.showToast(texts.reconnectMissingCredentials || 'Please enter username and password', 'error')
    return
  }

  const texts = i18n[state.currentLang] || i18n.zh
  if (elements.reconnectBtn) {
    elements.reconnectBtn.disabled = true
    elements.reconnectBtn.textContent = texts.reconnecting || 'Reconnecting…'
  }
  ui.showLoading()

  try {
    const result = await loginToServer(serverUrl, username, password, remember)
    await setStorage({ serverUrl, savedUsername: username, rememberLogin: remember }, 'sync')
    await setStorage({ token: result.token, user: result.user }, 'local')

    // 把新 token 写回 in-memory config 并回到主界面
    state.config.token = result.token
    state.config.serverUrl = serverUrl
    ui.showMainContent()
    ui.showToast(texts.reconnected || 'Reconnected', 'success')
    await categoryController.loadCategories()
    await searchController.loadRecentBookmarks()
  } catch (error) {
    const message = error?.message || texts.reconnectFailed || 'Reconnect failed'
    ui.showToast(message, 'error')
  } finally {
    if (elements.reconnectBtn) {
      elements.reconnectBtn.disabled = false
      elements.reconnectBtn.textContent = texts.reconnect || 'Reconnect'
    }
    ui.hideLoading()
  }
}
