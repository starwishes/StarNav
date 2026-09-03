import { normalizeUrl } from '../common/url.js'
import {
  getErrorMessage,
  initApi,
  apiRequest,
  isAllowedLoginOrigin,
  loginToServer,
  normalizeServerUrl
} from '../utils/api.js'
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

/** 待捕获项过期阈值：超过则丢弃，防止陈旧 badge/表单误导。 */
const PENDING_CAPTURE_MAX_AGE_MS = 24 * 60 * 60 * 1000

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
  performSearch: searchController.performSearch,
  // 待捕获项只在保存成功后消费（ts 校验防误删更新捕获）；展示/取消时保留待下次重试。
  onPendingCaptureConsumed: async () => {
    const capture = state.currentPendingCapture
    state.currentPendingCapture = null
    if (capture) {
      try {
        await discardPendingCapture(capture)
      } catch (error) {
        console.warn('清除待捕获项失败，已保留待下次重试', error)
      }
    }
  }
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

// 连接卡片预填（init/handleAuthError/handleLogout 三处共用）：
// 读取已保存的服务器地址/用户名/记住登录并回填表单，返回 { serverUrl, savedUsername }。
async function prefillReconnectCard() {
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
  return { serverUrl, savedUsername }
}

// 读取待捕获项但不删除：展示成功后再清理，失败则保留待下次重试，避免内容丢失
async function peekPendingCapture() {
  const stored = await getMergedStorage(['pendingCapture'])
  const capture = stored.pendingCapture
  if (!capture?.url) {
    return null
  }

  // 捕获时间戳超 24h 视为过期：清理并清除 badge，避免陈旧待办误导用户。
  if (typeof capture.ts === 'number' && Date.now() - capture.ts > PENDING_CAPTURE_MAX_AGE_MS) {
    await discardPendingCapture(capture)
    return null
  }

  return capture
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
    const { serverUrl, savedUsername } = await prefillReconnectCard()
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

  // 待捕获页面表单展示时保留 pendingCapture：popup 失焦即关，若展示即弃，
  // 用户没点保存内容已删（真实数据丢失）。改为保存成功后再清除。
  const pendingCapture = await peekPendingCapture()
  if (pendingCapture) {
    state.currentPendingCapture = pendingCapture
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
  elements.logoutBtn?.addEventListener('click', handleLogout)
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

async function handleAuthError(authError) {
  state.config.token = ''

  // Keep savedUsername for reconnect; only clear auth secrets.
  await removeStorage(['token', 'user'], 'local')
  await removeStorage(['token', 'user'], 'sync')

  // 优先按服务端 error code 判定过期；兼容旧服务端/纯字符串兜底。
  const code = authError?.payload?.code
  const message = typeof authError === 'string' ? authError : authError?.message || ''
  const reasonKey =
    code === 'TOKEN_EXPIRED' ||
    code === 'SESSION_INVALID' ||
    message === '令牌已过期' ||
    /expired/i.test(message)
      ? 'tokenExpired'
      : 'tokenInvalid'

  // 会话失效时在内联连接卡片里预填网址/用户名,用户只需补密码。
  await prefillReconnectCard()
  ui.showNotConnected(reasonKey, 'reconnect')
  // 聚焦密码框,Enter 提交
  setTimeout(() => elements.reconnectPassword?.focus(), 0)
}

// 显式登出：清 token/user（不依赖 401），回到连接卡片。
// savedUsername 保留在 local，下次打开仍预填用户名；如需彻底清除可取消下一行注释。
async function handleLogout() {
  const texts = i18n[state.currentLang] || i18n.zh
  state.config.token = ''
  state.config.serverUrl = ''

  await removeStorage(['token', 'user'], 'local')
  await removeStorage(['token', 'user'], 'sync')

  const { savedUsername } = await prefillReconnectCard()
  ui.showNotConnected('', 'reconnect')
  ui.showToast(texts.loggedOut, 'success')
  setTimeout(() => {
    if (!savedUsername) {
      elements.reconnectUsername?.focus()
    } else {
      elements.reconnectPassword?.focus()
    }
  }, 0)
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

  if (!isAllowedLoginOrigin(serverUrl)) {
    ui.showToast(texts.connectInsecure, 'error')
    return
  }

  if (elements.reconnectBtn) {
    elements.reconnectBtn.disabled = true
    elements.reconnectBtn.textContent = texts.connecting
  }
  ui.showLoading()

  try {
    const result = await loginToServer(serverUrl, username, password, remember)
    // serverUrl 跨设备同步；用户名/记住登录属于隐私偏好，只放本机 local。
    await setStorage({ serverUrl }, 'sync')
    await setStorage({ savedUsername: username, rememberLogin: remember }, 'local')
    // token 统一存 local：storage.session 仅 Chrome 102+ / Firefox 115+ 支持，
    // 而本扩展支持 Firefox ≥74，会话级存储会破坏旧版兼容。取舍：token 不跨设备
    // 同步（local 本机持久），remember=false 时过期由服务端 90 天有效期兜底。
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
        state.currentPendingCapture = pendingCapture
        await bookmarkController.showAddFormFromCapture(pendingCapture)
      }
    } catch (captureError) {
      console.warn('展示待捕获表单失败，已保留待重试', captureError)
    }
  } catch (error) {
    // ApiError（服务端信封，如"登录服务异常"）保留业务文案；网络层原生错误
    // （Failed to fetch / 超时）回退本地化 connectFailed，不展原文
    ui.showToast(getErrorMessage(error, texts.connectFailed), 'error')
  } finally {
    if (elements.reconnectBtn) {
      elements.reconnectBtn.disabled = false
      elements.reconnectBtn.textContent = texts.connect
    }
    ui.hideLoading()
  }
}
