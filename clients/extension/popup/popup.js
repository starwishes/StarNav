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
import { createUiHelpers } from './modules/ui.js'

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

// 读取待捕获项但不删除：展示成功后再清理，失败则保留待下次重试，避免内容丢失
async function peekPendingCapture() {
  const stored = await getMergedStorage(['pendingCapture'])
  const capture = stored.pendingCapture
  return capture?.url ? capture : null
}

// 仅当存储中仍是同一个捕获（按 ts 校验）时才删除，
// 避免展示表单期间用户又捕获了新页面导致误删新条目
async function discardPendingCapture(capture) {
  const stored = await getMergedStorage(['pendingCapture'])
  const current = stored.pendingCapture
  if (!current || current.ts !== capture?.ts) {
    return
  }
  await removeStorage(['pendingCapture'], 'local')
  await clearPendingCaptureBadge()
}

async function init() {
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
    // 未连接或会话失效:内联连接卡片(服务器地址+用户名+密码)。
    // 已保存的网址/用户名自动预填,用户只需补密码即可重连。
    const stored = await getMergedStorage(['serverUrl', 'savedUsername', 'rememberLogin'])
    const serverUrl = normalizeServerUrl(stored.serverUrl || state.config.serverUrl)
    const savedUsername = stored.savedUsername || ''
    if (elements.reconnectServerUrl) {
      elements.reconnectServerUrl.value = serverUrl
    }
    if (elements.reconnectUsername) {
      elements.reconnectUsername.value = savedUsername
    }
    if (elements.reconnectRemember) {
      elements.reconnectRemember.checked = stored.rememberLogin === true
    }
    const mode = serverUrl && savedUsername ? 'reconnect' : 'setup'
    ui.showNotConnected(mode === 'reconnect' ? 'tokenExpired' : '', mode)
    if (!serverUrl) {
      setTimeout(() => elements.reconnectServerUrl?.focus(), 0)
    } else if (!savedUsername) {
      setTimeout(() => elements.reconnectUsername?.focus(), 0)
    } else {
      setTimeout(() => elements.reconnectPassword?.focus(), 0)
    }
    setupEventListeners()
    window.__STARNAV_POPUP_READY = true
    return
  }

  ui.showMainContent()
  await categoryController.loadCategories()
  await searchController.loadRecentBookmarks()
  setupEventListeners()

  const pendingCapture = await peekPendingCapture()
  if (pendingCapture) {
    await bookmarkController.showAddFormFromCapture(pendingCapture)
    await discardPendingCapture(pendingCapture)
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
  const reconnectEnterHandler = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleReconnect()
    }
  }
  elements.reconnectPassword?.addEventListener('keydown', reconnectEnterHandler)
  elements.reconnectServerUrl?.addEventListener('keydown', reconnectEnterHandler)
  elements.reconnectUsername?.addEventListener('keydown', reconnectEnterHandler)
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

  // 会话失效时在内联连接卡片里预填网址/用户名,用户只需补密码。
  const stored = await getMergedStorage(['serverUrl', 'savedUsername', 'rememberLogin'])
  const serverUrl = normalizeServerUrl(stored.serverUrl || state.config.serverUrl)
  const savedUsername = stored.savedUsername || ''
  if (elements.reconnectServerUrl) {
    elements.reconnectServerUrl.value = serverUrl
  }
  if (elements.reconnectUsername) {
    elements.reconnectUsername.value = savedUsername
  }
  if (elements.reconnectRemember) {
    elements.reconnectRemember.checked = stored.rememberLogin === true
  }
  ui.showNotConnected(reasonKey, 'reconnect')
  // 聚焦密码框,Enter 提交
  setTimeout(() => elements.reconnectPassword?.focus(), 0)
}

async function handleReconnect() {
  const texts = i18n[state.currentLang] || i18n.zh
  const stored = await getMergedStorage(['serverUrl'])
  const serverUrl = normalizeServerUrl(
    elements.reconnectServerUrl?.value.trim() || stored.serverUrl || state.config.serverUrl
  )
  const username = elements.reconnectUsername?.value.trim() || ''
  const password = elements.reconnectPassword?.value || ''
  const remember = elements.reconnectRemember?.checked === true

  if (!serverUrl || !username || !password) {
    ui.showToast(texts.connectMissingCredentials, 'error')
    return
  }

  if (elements.reconnectBtn) {
    elements.reconnectBtn.disabled = true
    elements.reconnectBtn.textContent = texts.connecting
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
    ui.showToast(texts.connected, 'success')
    await categoryController.loadCategories()
    await searchController.loadRecentBookmarks()

    // 离线期间通过右键菜单/快捷键捕获的页面，重连成功后立即消化并补全表单。
    // 展示失败只保留捕获待下次重试，不能把已成功的连接误报成失败。
    try {
      const pendingCapture = await peekPendingCapture()
      if (pendingCapture) {
        await bookmarkController.showAddFormFromCapture(pendingCapture)
        await discardPendingCapture(pendingCapture)
      }
    } catch (captureError) {
      console.warn('展示待捕获表单失败，已保留待重试', captureError)
    }
  } catch (error) {
    const message = error?.message || texts.connectFailed
    ui.showToast(message, 'error')
  } finally {
    if (elements.reconnectBtn) {
      elements.reconnectBtn.disabled = false
      elements.reconnectBtn.textContent = texts.connect
    }
    ui.hideLoading()
  }
}
