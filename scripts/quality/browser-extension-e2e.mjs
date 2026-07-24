/* global URL, chrome, console, document, history, process, window */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import jwt from 'jsonwebtoken'
import { chromium, request } from 'playwright-core'

import { buildRealisticBookmarkDataset } from '../../src/server/tools/realisticBookmarkDataset.js'
import { normalizeUrl } from '../../clients/extension/utils/url.js'

const baseUrl = String(process.env.BASE_URL || 'http://host.docker.internal:38112').replace(
  /\/+$/,
  ''
)
const adminPassword = process.env.ADMIN_PASSWORD || 'BrowserQa123!'
const jwtSecret =
  process.env.JWT_SECRET || 'browser-regression-secret-0123456789abcdef0123456789abcdef'
const extensionSourceDir = path.resolve(
  process.env.EXTENSION_SOURCE_DIR || path.resolve(process.cwd(), 'clients/extension')
)

const updatedBookmarkName = 'GitHub Extension E2E'
const deletedBookmarkUrl = normalizeUrl('https://gitlab.com')
const editedBookmarkUrl = normalizeUrl('https://github.com')
const extensionCategoryName = 'Extension E2E 分类'
const targetTitle = 'Extension E2E Target'
const targetDescription = 'Playwright-loaded extension captures this page through real browser APIs.'

const tempPaths = []

const log = (message) => {
  console.log(`[browser-extension-e2e] ${message}`)
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const getPayloadData = (payload) => payload?.data || payload

const extensionTexts = {
  notConnectedTip: ['请先配置服务器地址', 'Please configure server address first'],
  connectionFailedStatus: ['连接失败', 'Connection failed'],
  connectedStatus: ['已连接', 'Connected'],
  updateSuccess: ['更新成功', 'Updated successfully'],
  deleteSuccess: ['删除成功', 'Deleted successfully'],
  categoryCreated: ['分类创建成功', 'Category created successfully'],
  bookmarkAdded: ['书签添加成功', 'Bookmark added successfully'],
  duplicateAlert: ['该页面已收藏', 'URL already exists, cannot add duplicate'],
  loadFailed: ['加载失败', 'Failed to load'],
  sessionExpiredStatus: ['登录已失效', 'Session expired'],
  sessionExpiredToast: ['令牌已过期', 'Session expired'],
  popupSessionExpiredToast: ['登录已过期', 'Session expired']
}

const toExpectedTexts = (expectedText) =>
  Array.isArray(expectedText) ? expectedText : [expectedText]

const waitForToast = async (page, expectedText) => {
  const expectedTexts = toExpectedTexts(expectedText)

  await page.waitForFunction((texts) => {
    const toast = document.getElementById('toast')
    const message = toast?.textContent || ''
    return texts.some((text) => message.includes(text))
  }, expectedTexts)
}

const waitForStatusText = async (page, expectedText) => {
  const expectedTexts = toExpectedTexts(expectedText)

  await page.waitForFunction((texts) => {
    const statusText = document.getElementById('statusText')?.textContent || ''
    return texts.some((text) => statusText.includes(text))
  }, expectedTexts)
}

const waitForPopupReady = async (page) => {
  await page.waitForFunction(() => window.__STARNAV_POPUP_READY === true)
}

const waitForOptionsReady = async (page) => {
  await page.waitForFunction(() => window.__STARNAV_OPTIONS_READY === true)
}

const waitForRecentBookmarks = async (page) => {
  await page.waitForFunction(
    () => document.querySelectorAll('#recentBookmarks .bookmark-item-wrapper').length > 0
  )
}

const waitForBodyText = async (page, expectedText) => {
  const expectedTexts = toExpectedTexts(expectedText)

  await page.waitForFunction((texts) => {
    const content = document.body?.innerText || ''
    return texts.some((text) => content.includes(text))
  }, expectedTexts)
}

const attachPageDebug = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error(`[browser-extension-e2e] ${label} console error: ${message.text()}`)
    }
  })

  page.on('pageerror', (error) => {
    console.error(`[browser-extension-e2e] ${label} pageerror`, error)
  })
}

const readStorage = async (page, area, keys) =>
  page.evaluate(
    ([storageArea, storageKeys]) =>
      new Promise((resolve) => {
        chrome.storage[storageArea].get(storageKeys, resolve)
      }),
    [area, keys]
  )

const writeStorage = async (page, area, values) =>
  page.evaluate(
    ([storageArea, nextValues]) =>
      new Promise((resolve) => {
        chrome.storage[storageArea].set(nextValues, resolve)
      }),
    [area, values]
  )

const createTempDir = async (prefix) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempPaths.push(directory)
  return directory
}

const createExpiredToken = () =>
  jwt.sign({ username: 'admin', level: 3, source: 'extension-e2e' }, jwtSecret, {
    expiresIn: -60
  })

const createExtensionUrls = (extensionId) => ({
  popupUrl: `chrome-extension://${extensionId}/popup/popup.html`,
  optionsUrl: `chrome-extension://${extensionId}/options/options.html`
})

const openExtensionPage = async ({ context, url, label, dialogMode = 'dismiss' }) => {
  const page = await context.newPage()
  attachPageDebug(page, label)

  if (dialogMode === 'dismiss') {
    page.on('dialog', async (dialog) => {
      await dialog.dismiss()
    })
  } else if (dialogMode === 'accept') {
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })
  }

  await page.goto(url)
  return page
}

const routeJsonFailure = async (page, pattern, errorMessage, status = 500) => {
  const handler = async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    })
  }

  await page.route(pattern, handler)
  return async () => {
    await page.unroute(pattern, handler)
  }
}

const loginAsAdmin = async (api) => {
  const response = await api.post('/api/login', {
    data: {
      username: 'admin',
      password: adminPassword
    }
  })

  assert(response.ok(), 'admin login failed for extension E2E')

  const payload = getPayloadData(await response.json())
  const token = payload?.token

  assert(typeof token === 'string' && token.length > 20, 'missing admin token for extension E2E')
  return token
}

const seedRealisticDataset = async (api, token) => {
  const dataset = buildRealisticBookmarkDataset()
  const response = await api.post('/api/data', {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: {
      action: 'extension-e2e-seed',
      ...dataset
    }
  })

  assert(response.ok(), 'failed to seed realistic dataset for extension E2E')
  return dataset
}

const checkBookmark = async (api, token, url) => {
  const response = await api.get(`/api/bookmark/check?url=${encodeURIComponent(url)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  assert(response.ok(), `bookmark check failed for ${url}`)
  return getPayloadData(await response.json())
}

const loadExtensionContext = async (extensionDir) => {
  await fs.access(extensionDir)

  const userDataDir = await createTempDir('starnav-extension-e2e-')
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    viewport: {
      width: 1440,
      height: 1200
    },
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`
    ]
  })

  let serviceWorker = context.serviceWorkers()[0]
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker')
  }

  const extensionId = new URL(serviceWorker.url()).host
  assert(extensionId, 'failed to resolve extension id')

  return {
    context,
    serviceWorker,
    extensionId
  }
}

const openBackgroundExtensionTab = async ({ context, serviceWorker, url }) => {
  const pagePromise = context.waitForEvent('page')

  await serviceWorker.evaluate(
    async (tabUrl) =>
      await new Promise((resolve, reject) => {
        chrome.tabs.create({ url: tabUrl, active: false }, (tab) => {
          const error = chrome.runtime.lastError
          if (error) {
            reject(new Error(error.message))
            return
          }

          resolve(tab?.id || null)
        })
      }),
    url
  )

  const page = await pagePromise
  await page.waitForLoadState('domcontentloaded')
  return page
}

const exerciseRawFirstInstallAndOptions = async ({ context, optionsUrl, popupUrl }) => {
  log('verify first-install not-connected flow on raw extension')

  const popupPage = await openExtensionPage({
    context,
    url: popupUrl,
    label: 'raw-popup-first-install'
  })
  await waitForPopupReady(popupPage)
  await popupPage.waitForFunction(() => {
    const notConnected = document.getElementById('notConnected')
    return notConnected?.style.display !== 'none'
  })
  await waitForBodyText(popupPage, extensionTexts.notConnectedTip)

  const rawSyncStorage = await readStorage(popupPage, 'sync', ['serverUrl'])
  assert(!rawSyncStorage.serverUrl, 'raw extension unexpectedly booted with saved serverUrl')
  await popupPage.close()

  log('exercise options failure handling before the extension is configured')

  const optionsPage = await openExtensionPage({
    context,
    url: optionsUrl,
    label: 'raw-options'
  })
  await waitForOptionsReady(optionsPage)

  await optionsPage.locator('#serverUrl').fill(`${baseUrl}/`)
  await optionsPage.locator('#username').fill('admin')
  await optionsPage.locator('#password').fill(adminPassword)

  const removeHealthRoute = await routeJsonFailure(optionsPage, '**/api/health', '健康检查暂不可用')
  await optionsPage.locator('#testBtn').click()
  await waitForToast(optionsPage, '健康检查暂不可用')
  await removeHealthRoute()

  const removeLoginRoute = await routeJsonFailure(optionsPage, '**/api/login', '登录服务异常')
  await optionsPage.locator('#saveBtn').click()
  await waitForToast(optionsPage, '登录服务异常')
  await waitForStatusText(optionsPage, extensionTexts.connectionFailedStatus)
  await removeLoginRoute()

  const localAfterFailure = await readStorage(optionsPage, 'local', ['token'])
  assert(!localAfterFailure.token, 'failed login unexpectedly persisted a token')

  log('connect the raw source extension through the real options page')

  await optionsPage.locator('#saveBtn').click()
  await waitForStatusText(optionsPage, extensionTexts.connectedStatus)

  const syncStorage = await readStorage(optionsPage, 'sync', ['serverUrl', 'savedUsername'])
  const localStorage = await readStorage(optionsPage, 'local', ['token', 'user'])

  assert(syncStorage.serverUrl === baseUrl, 'raw extension did not persist normalized server URL')
  assert(syncStorage.savedUsername === 'admin', 'raw extension did not persist saved username')
  assert(
    typeof localStorage.token === 'string' && localStorage.token.length > 20,
    'raw extension did not persist auth token'
  )
  assert(localStorage.user?.login === 'admin', 'raw extension did not persist current user')

  return optionsPage
}

const exercisePopupCrudFlows = async ({ api, token, context, popupUrl }) => {
  log('exercise popup search, edit, and delete flows on the raw extension')

  const popupPage = await openExtensionPage({
    context,
    url: popupUrl,
    label: 'raw-popup-crud',
    dialogMode: 'accept'
  })

  await waitForPopupReady(popupPage)
  await waitForRecentBookmarks(popupPage)
  await popupPage.waitForFunction(() => document.body?.innerText?.includes('GitHub'))

  await popupPage.locator('#searchInput').fill('GitHub')
  await popupPage.waitForFunction(() =>
    document.getElementById('searchResults')?.innerText?.includes('GitHub')
  )

  const githubResult = popupPage
    .locator('#searchResults .bookmark-item-wrapper')
    .filter({ hasText: 'GitHub' })
    .first()
  await githubResult.locator('.edit-btn').click()
  await popupPage.locator('#bookmarkName').fill(updatedBookmarkName)
  await popupPage.locator('#submitBookmark').click()
  await waitForToast(popupPage, extensionTexts.updateSuccess)

  const editedBookmark = await checkBookmark(api, token, editedBookmarkUrl)
  assert(editedBookmark.exists === true, 'edited bookmark unexpectedly disappeared')
  assert(
    editedBookmark.item?.name === updatedBookmarkName,
    'edited bookmark name was not persisted through popup E2E'
  )

  await popupPage.evaluate(() => {
    window.confirm = () => true
  })
  await popupPage.locator('#searchInput').fill('GitLab')
  await popupPage.waitForFunction(() =>
    document.getElementById('searchResults')?.innerText?.includes('GitLab')
  )

  const gitlabResult = popupPage
    .locator('#searchResults .bookmark-item-wrapper')
    .filter({ hasText: 'GitLab' })
    .first()
  await gitlabResult.locator('.delete-btn').click()
  await waitForToast(popupPage, extensionTexts.deleteSuccess)

  const deletedBookmark = await checkBookmark(api, token, deletedBookmarkUrl)
  assert(deletedBookmark.exists === false, 'deleted bookmark still exists after popup deletion')

  await popupPage.close()
}

const exerciseAddCurrentAndDuplicate = async ({
  api,
  token,
  context,
  serviceWorker,
  popupUrl
}) => {
  log('exercise add-current-page, category creation, and duplicate handling')

  const targetPage = await context.newPage()
  await targetPage.goto(`${baseUrl}/extension-e2e-target`, { waitUntil: 'networkidle' })

  const targetUrl = await targetPage.evaluate(
    ({ nextTitle, nextDescription }) => {
      document.title = nextTitle

      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }

      meta.setAttribute('content', nextDescription)
      history.replaceState({}, '', '/extension-e2e-target')
      return window.location.href
    },
    {
      nextTitle: targetTitle,
      nextDescription: targetDescription
    }
  )

  await targetPage.bringToFront()

  const popupCapturePage = await openBackgroundExtensionTab({
    context,
    serviceWorker,
    url: popupUrl
  })
  attachPageDebug(popupCapturePage, 'raw-popup-add-current')
  await waitForPopupReady(popupCapturePage)
  await waitForRecentBookmarks(popupCapturePage)

  await popupCapturePage.evaluate(() => {
    document.getElementById('addCurrentBtn')?.click()
  })

  await popupCapturePage.waitForFunction((expectedUrl) => {
    const addForm = document.getElementById('addForm')
    const bookmarkUrl = document.getElementById('bookmarkUrl')
    const bookmarkName = document.getElementById('bookmarkName')

    return (
      addForm?.style.display !== 'none' &&
      bookmarkUrl?.value === expectedUrl &&
      bookmarkName?.value.length > 0
    )
  }, targetUrl)

  await popupCapturePage.locator('#addCategoryBtn').click()
  await popupCapturePage.locator('#newCategoryName').fill(extensionCategoryName)
  await popupCapturePage.locator('#submitCategory').click()
  await waitForToast(popupCapturePage, extensionTexts.categoryCreated)
  await popupCapturePage.waitForFunction(
    (categoryName) =>
      Array.from(document.querySelectorAll('#bookmarkCategory option')).some(
        (option) => option.textContent === categoryName
      ),
    extensionCategoryName
  )

  await popupCapturePage.locator('#bookmarkName').fill(targetTitle)
  await popupCapturePage.locator('#submitBookmark').click()
  await waitForToast(popupCapturePage, extensionTexts.bookmarkAdded)

  const capturedBookmark = await checkBookmark(api, token, normalizeUrl(targetUrl))
  assert(capturedBookmark.exists === true, 'captured page bookmark was not created')
  assert(
    capturedBookmark.item?.name === targetTitle,
    'captured bookmark name does not match the target page title'
  )

  const categoriesResponse = await api.get('/api/categories/simple', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  assert(categoriesResponse.ok(), 'failed to read categories after popup category creation')
  const categoriesPayload = getPayloadData(await categoriesResponse.json())
  assert(
    (categoriesPayload.categories || []).some((category) => category.name === extensionCategoryName),
    'new popup-created category was not persisted'
  )

  await popupCapturePage.close()

  log('exercise duplicate current-page detection')

  await targetPage.bringToFront()

  const duplicatePopupPage = await openBackgroundExtensionTab({
    context,
    serviceWorker,
    url: popupUrl
  })
  attachPageDebug(duplicatePopupPage, 'raw-popup-duplicate-current')
  await waitForPopupReady(duplicatePopupPage)
  await waitForRecentBookmarks(duplicatePopupPage)

  await duplicatePopupPage.evaluate(() => {
    document.getElementById('addCurrentBtn')?.click()
  })

  await waitForToast(duplicatePopupPage, extensionTexts.duplicateAlert)
  await duplicatePopupPage.waitForFunction((expectedUrl) => {
    const duplicateWarning = document.getElementById('duplicateWarning')
    const bookmarkUrl = document.getElementById('bookmarkUrl')
    return duplicateWarning?.style.display !== 'none' && bookmarkUrl?.value === expectedUrl
  }, targetUrl)

  const duplicateWarningText = await duplicatePopupPage.locator('#duplicateName').textContent()
  assert(
    duplicateWarningText?.includes(targetTitle),
    'duplicate add-current flow did not surface the existing bookmark details'
  )

  await duplicatePopupPage.close()
  await targetPage.close()
}

const exercisePopupFailureHandling = async ({ context, popupUrl }) => {
  log('exercise popup failure handling for backend errors')

  const popupFailurePage = await openExtensionPage({
    context,
    url: popupUrl,
    label: 'raw-popup-failure'
  })
  const removeSearchRoute = await routeJsonFailure(
    popupFailurePage,
    '**/api/bookmark/search**',
    '书签服务暂不可用'
  )

  await popupFailurePage.reload()
  await waitForPopupReady(popupFailurePage)
  await waitForBodyText(popupFailurePage, extensionTexts.loadFailed)

  await popupFailurePage.locator('#searchInput').fill('GitHub')
  await waitForBodyText(popupFailurePage, extensionTexts.loadFailed)

  await removeSearchRoute()
  await popupFailurePage.close()
}

const exerciseOptionsAuthInvalidation = async (optionsPage) => {
  log('exercise options auth invalidation when the saved token is expired')

  await writeStorage(optionsPage, 'sync', {
    serverUrl: baseUrl,
    savedUsername: 'admin'
  })
  await writeStorage(optionsPage, 'local', {
    token: createExpiredToken(),
    user: { login: 'admin' }
  })

  await optionsPage.reload()
  await waitForOptionsReady(optionsPage)
  await waitForStatusText(optionsPage, extensionTexts.sessionExpiredStatus)
  await waitForToast(optionsPage, extensionTexts.sessionExpiredToast)

  const localStorage = await readStorage(optionsPage, 'local', ['token', 'user'])
  assert(!localStorage.token, 'options invalidation did not clear the expired token')
  assert(!localStorage.user, 'options invalidation did not clear the stored user')
}

const exercisePopupAuthInvalidation = async ({ context, popupUrl, storagePage }) => {
  log('exercise popup auth invalidation when the saved token is expired')

  await writeStorage(storagePage, 'sync', {
    serverUrl: baseUrl,
    savedUsername: 'admin'
  })
  await writeStorage(storagePage, 'local', {
    token: createExpiredToken(),
    user: { login: 'admin' }
  })

  const popupPage = await openExtensionPage({
    context,
    url: popupUrl,
    label: 'raw-popup-expired-token'
  })
  await waitForPopupReady(popupPage)
  await waitForToast(popupPage, extensionTexts.popupSessionExpiredToast)
  await popupPage.waitForFunction(() => {
    const notConnected = document.getElementById('notConnected')
    return notConnected?.style.display !== 'none'
  })

  const localStorage = await readStorage(popupPage, 'local', ['token', 'user'])
  assert(!localStorage.token, 'popup invalidation did not clear the expired token')
  assert(!localStorage.user, 'popup invalidation did not clear the stored user')

  await popupPage.close()
}

async function run() {
  const api = await request.newContext({ baseURL: baseUrl })
  let rawRuntime = null

  try {
    const token = await loginAsAdmin(api)
    await seedRealisticDataset(api, token)

    rawRuntime = await loadExtensionContext(extensionSourceDir)
    const { popupUrl, optionsUrl } = createExtensionUrls(rawRuntime.extensionId)

    const optionsPage = await exerciseRawFirstInstallAndOptions({
      context: rawRuntime.context,
      popupUrl,
      optionsUrl
    })

    await exercisePopupCrudFlows({
      api,
      token,
      context: rawRuntime.context,
      popupUrl
    })

    await exerciseAddCurrentAndDuplicate({
      api,
      token,
      context: rawRuntime.context,
      serviceWorker: rawRuntime.serviceWorker,
      popupUrl
    })

    await exercisePopupFailureHandling({
      context: rawRuntime.context,
      popupUrl
    })

    await exerciseOptionsAuthInvalidation(optionsPage)

    await exercisePopupAuthInvalidation({
      context: rawRuntime.context,
      popupUrl,
      storagePage: optionsPage
    })

    await optionsPage.close()
    await rawRuntime.context.close()
    rawRuntime = null

    log('browser extension E2E passed')
  } finally {
    await api.dispose()
    await rawRuntime?.context?.close()

    await Promise.all(
      tempPaths.map((targetPath) => fs.rm(targetPath, { recursive: true, force: true }))
    )
  }
}

run().catch((error) => {
  console.error('[browser-extension-e2e] FAILED')
  console.error(error)
  process.exit(1)
})
