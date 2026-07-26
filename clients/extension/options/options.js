import { checkHealth, loginToServer, normalizeServerUrl, validateSession } from '../utils/api.js'
import { ensureHostPermission } from '../utils/permissions.js'
import {
  applyDocumentLanguage,
  applyThemeMode,
  resolveExtensionLanguage,
  resolveExtensionThemeMode
} from '../utils/preferences.js'
import { getMergedStorage, removeStorage, setStorage } from '../utils/storage.js'

const elements = {
  serverUrl: document.getElementById('serverUrl'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  saveBtn: document.getElementById('saveBtn'),
  testBtn: document.getElementById('testBtn'),
  themeToggle: document.getElementById('themeToggle'),
  statusBox: document.getElementById('statusBox'),
  statusIcon: document.getElementById('statusIcon'),
  statusText: document.getElementById('statusText'),
  toast: document.getElementById('toast')
}

const i18n = {
  zh: {
    pageTitle: 'StarNav 插件设置',
    heroTitle: '把 StarNav 装进浏览器。',
    heroCopy:
      '连接你的 StarNav 实例后，扩展会记住站点地址与登录信息；显示语言跟随偏好，外观仅支持日/夜模式。',
    connectionTitle: '连接状态',
    statusDisconnected: '未连接',
    statusDisconnectedHint: '建议使用 HTTPS 部署主站，这样扩展和后台登录都更稳定。',
    connectCardTitle: '连接到你的 StarNav',
    serverUrlLabel: '服务器地址',
    serverUrlHint: '输入你部署的 StarNav 导航站地址，支持本地开发和正式环境。',
    serverUrlPlaceholder: 'http://127.0.0.1:3333',
    usernameLabel: '用户名',
    usernamePlaceholder: 'admin',
    passwordLabel: '密码',
    passwordPlaceholder: '••••••••',
    saveConnect: '保存并连接',
    disconnect: '断开连接',
    connecting: '连接中...',
    testConnection: '测试连接',
    testingConnection: '测试中...',
    guideTitle: '使用说明',
    guideStep1Title: '填入主站地址',
    guideStep1Copy: '插件会优先读取你已保存的站点地址，你也可以随时在这里改成新的部署地址。',
    guideStep2Title: '登录管理员账户',
    guideStep2Copy: '连接成功后可以直接在 popup 里搜索、收藏当前页面，并写回 StarNav 后端。',
    guideStep3Title: '从工具栏快速使用',
    guideStep3Copy: '工具栏图标可搜索/添加书签；也可使用右键菜单或 Alt+Shift+A 添加当前页。',
    connectedAs: '已连接 ({username})',
    disconnectStatus: '已断开',
    sessionExpiredStatus: '登录已失效。用户名已保留，请重新输入密码后连接。',
    disconnectToast: '已断开连接',
    missingServerUrl: '请输入服务器地址',
    missingCredentials: '请输入用户名和密码',
    permissionDenied: '需要允许访问该站点地址后才能连接',
    insecureWarning: '警告：非 HTTPS 连接可能存在安全风险',
    connectSuccess: '连接成功！现在可以在 popup 中使用插件功能了。',
    connectionFailedStatus: '连接失败',
    connectionFailed: '连接失败',
    healthSuccess: '服务器正常 (v{version})',
    healthFailed: '无法连接到服务器',
    toggleTheme: '切换日/夜模式'
  },
  en: {
    pageTitle: 'StarNav Extension Settings',
    heroTitle: 'Bring StarNav into your browser.',
    heroCopy:
      'After connecting to your StarNav instance, the extension remembers the site URL and login state. Language follows your preference; appearance is light/dark only.',
    connectionTitle: 'Connection',
    statusDisconnected: 'Not connected',
    statusDisconnectedHint:
      'HTTPS is recommended so the extension and admin login stay more reliable.',
    connectCardTitle: 'Connect to your StarNav',
    serverUrlLabel: 'Server URL',
    serverUrlHint:
      'Enter the address of your deployed StarNav site. Local development and production are both supported.',
    serverUrlPlaceholder: 'http://127.0.0.1:3333',
    usernameLabel: 'Username',
    usernamePlaceholder: 'admin',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    saveConnect: 'Save and Connect',
    disconnect: 'Disconnect',
    connecting: 'Connecting...',
    testConnection: 'Test Connection',
    testingConnection: 'Testing...',
    guideTitle: 'How It Works',
    guideStep1Title: 'Enter your site URL',
    guideStep1Copy:
      'The extension prefers the site URL you have already saved, but you can point it at a new deployment here at any time.',
    guideStep2Title: 'Sign in as admin',
    guideStep2Copy:
      'Once connected, you can search, save the current page, and write changes back to the StarNav backend from the popup.',
    guideStep3Title: 'Use it from the toolbar',
    guideStep3Copy:
      'Use the toolbar popup to search/add bookmarks, or add the current page via the context menu / Alt+Shift+A.',
    connectedAs: 'Connected ({username})',
    disconnectStatus: 'Disconnected',
    sessionExpiredStatus: 'Session expired. Username kept — re-enter password to reconnect.',
    disconnectToast: 'Disconnected',
    missingServerUrl: 'Please enter the server URL',
    missingCredentials: 'Please enter both username and password',
    permissionDenied: 'Host access for this site is required before connecting',
    insecureWarning: 'Warning: non-HTTPS connections may be insecure',
    connectSuccess: 'Connected successfully. You can now use the popup features.',
    connectionFailedStatus: 'Connection failed',
    connectionFailed: 'Connection failed',
    healthSuccess: 'Server is healthy (v{version})',
    healthFailed: 'Unable to reach the server',
    toggleTheme: 'Toggle light/dark mode'
  }
}

const state = {
  currentLang: 'en',
  currentThemeMode: 'light'
}

let isConnected = false
window.__STARNAV_OPTIONS_READY = false

document.addEventListener('DOMContentLoaded', init)

const getTexts = () => i18n[state.currentLang]

const formatText = (key, variables = {}) =>
  (getTexts()[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? ''))

async function init() {
  const stored = await getMergedStorage([
    'serverUrl',
    'token',
    'user',
    'savedUsername',
    'lang',
    'locale',
    'themeMode',
    'theme-mode'
  ])

  // Drop legacy preset/accent keys from older extension installs.
  await removeStorage(['themePreset', 'themeColor'], 'sync')
  await removeStorage(['themePreset', 'themeColor'], 'local')

  state.currentLang = resolveExtensionLanguage(stored)
  state.currentThemeMode = resolveExtensionThemeMode(stored)

  applyDocumentLanguage(state.currentLang)
  applyThemeMode(state.currentThemeMode)
  updateStaticText()

  if (stored.serverUrl) {
    elements.serverUrl.value = stored.serverUrl
  }

  if (stored.savedUsername) {
    elements.username.value = stored.savedUsername
  }

  if (stored.token) {
    isConnected = true
    const username = stored.user?.login || stored.user?.name || stored.savedUsername || 'user'
    updateStatus(true, formatText('connectedAs', { username }))
    if (stored.user?.login) {
      elements.username.value = stored.user.login
    }
    void validateStoredConnection(stored.serverUrl, stored.token)
  } else {
    updateStatus(false, formatText('statusDisconnected'))
  }

  setupEventListeners()
  window.__STARNAV_OPTIONS_READY = true
}

async function validateStoredConnection(serverUrl, token) {
  if (!serverUrl || !token) {
    return
  }

  try {
    const granted = await ensureHostPermission(serverUrl)
    if (!granted) {
      return
    }
    await validateSession(serverUrl, token)
  } catch (error) {
    if (error?.status !== 401) {
      return
    }

    await removeStorage(['token', 'user'], 'local')
    await removeStorage(['token', 'user'], 'sync')
    isConnected = false
    updateStatus(false, formatText('sessionExpiredStatus'))
    showToast(error.message || formatText('sessionExpiredStatus'), 'error')
  }
}

function setupEventListeners() {
  elements.saveBtn.addEventListener('click', handleSaveClick)
  elements.testBtn.addEventListener('click', testConnection)
  elements.themeToggle?.addEventListener('click', toggleTheme)
}

async function toggleTheme() {
  state.currentThemeMode = state.currentThemeMode === 'dark' ? 'light' : 'dark'
  applyThemeMode(state.currentThemeMode)
  await setStorage({ themeMode: state.currentThemeMode })
  updateStaticText()
}

function updateStaticText() {
  document.title = formatText('pageTitle')

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')
    if (!key) {
      return
    }

    element.textContent = formatText(key)
  })

  if (elements.themeToggle) {
    elements.themeToggle.title = formatText('toggleTheme')
  }

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder')
    if (!key) {
      return
    }

    element.setAttribute('placeholder', formatText(key))
  })
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message
  elements.toast.className = `toast ${type}`
  elements.toast.style.display = 'block'
  setTimeout(() => {
    elements.toast.style.display = 'none'
  }, 3000)
}

function updateStatus(connected, text) {
  isConnected = connected
  if (connected) {
    elements.statusBox.className = 'status connected'
    elements.statusIcon.textContent = '✅'
  } else {
    elements.statusBox.className = 'status disconnected'
    elements.statusIcon.textContent = '⚠️'
  }
  elements.statusText.textContent = text
  updateButtonState()
}

function updateButtonState() {
  elements.saveBtn.classList.remove('btn-danger')
  elements.saveBtn.classList.add('btn-primary')

  if (isConnected) {
    elements.saveBtn.textContent = formatText('disconnect')
    elements.saveBtn.classList.remove('btn-primary')
    elements.saveBtn.classList.add('btn-danger')
  } else {
    elements.saveBtn.textContent = formatText('saveConnect')
  }

  elements.testBtn.textContent = formatText('testConnection')
}

function setLoading(loading) {
  elements.saveBtn.disabled = loading
  elements.testBtn.disabled = loading
  if (loading) {
    elements.saveBtn.textContent = formatText('connecting')
  } else {
    updateButtonState()
  }
}

async function handleSaveClick() {
  if (isConnected) {
    await removeStorage(['token', 'user'], 'local')
    await removeStorage(['token', 'user'], 'sync')
    elements.password.value = ''
    isConnected = false

    updateStatus(false, formatText('disconnectStatus'))
    showToast(formatText('disconnectToast'), 'success')
    return
  }

  await saveAndConnect()
}

async function saveAndConnect() {
  const serverUrl = normalizeServerUrl(elements.serverUrl.value)
  const username = elements.username.value.trim()
  const password = elements.password.value

  if (!serverUrl) {
    showToast(formatText('missingServerUrl'), 'error')
    return
  }

  if (!username || !password) {
    showToast(formatText('missingCredentials'), 'error')
    return
  }

  try {
    setLoading(true)

    const granted = await ensureHostPermission(serverUrl)
    if (!granted) {
      showToast(formatText('permissionDenied'), 'error')
      return
    }

    const result = await loginToServer(serverUrl, username, password)

    if (
      !serverUrl.startsWith('https://') &&
      !serverUrl.includes('localhost') &&
      !serverUrl.includes('127.0.0.1')
    ) {
      showToast(formatText('insecureWarning'), 'error')
    }

    await setStorage(
      {
        serverUrl,
        savedUsername: username
      },
      'sync'
    )

    await setStorage(
      {
        token: result.token,
        user: result.user
      },
      'local'
    )

    isConnected = true
    updateStatus(true, formatText('connectedAs', { username: result.user?.login || username }))
    showToast(formatText('connectSuccess'), 'success')
    elements.password.value = ''
  } catch (error) {
    isConnected = false
    updateStatus(false, formatText('connectionFailedStatus'))
    showToast(error.message || formatText('connectionFailed'), 'error')
  } finally {
    setLoading(false)
  }
}

async function testConnection() {
  const serverUrl = normalizeServerUrl(elements.serverUrl.value)

  if (!serverUrl) {
    showToast(formatText('missingServerUrl'), 'error')
    return
  }

  try {
    elements.testBtn.disabled = true
    elements.testBtn.textContent = formatText('testingConnection')

    const granted = await ensureHostPermission(serverUrl)
    if (!granted) {
      showToast(formatText('permissionDenied'), 'error')
      return
    }

    const health = await checkHealth(serverUrl)
    showToast(formatText('healthSuccess', { version: health.version || '?' }), 'success')
  } catch (error) {
    showToast(error.message || formatText('healthFailed'), 'error')
  } finally {
    elements.testBtn.disabled = false
    elements.testBtn.textContent = formatText('testConnection')
  }
}
