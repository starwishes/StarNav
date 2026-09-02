const CONTEXT_MENU_ID = 'starnav-add-page'
const PENDING_CAPTURE_KEY = 'pendingCapture'

const isHttpUrl = (value) =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))

// 捕获仅保留最近一次：连续捕获两个页面时前一个会被覆盖（有意取舍）。
// 极端场景下用户可能丢失更早的捕获，但 pendingCapture 是"待保存"的一次性槽位，
// 展示后由 popup 在保存成功时消费；若改做多槽合并需要引入捕获列表与排序，
// 对当前单页捕获场景收益低、复杂度高，故维持"只保留最近一次"并明确注释。
const writePendingCapture = async (payload) => {
  await chrome.storage.local.set({
    [PENDING_CAPTURE_KEY]: {
      ...payload,
      ts: Date.now()
    }
  })

  try {
    await chrome.action?.setBadgeText?.({ text: '1' })
    await chrome.action?.setBadgeBackgroundColor?.({ color: '#409eff' })
  } catch {
    // Firefox MV2 uses browserAction; ignore badge failures.
  }

  try {
    await chrome.browserAction?.setBadgeText?.({ text: '1' })
  } catch {
    // Optional.
  }
}

// title：右键链接场景传入链接 URL 本身作为标题回退（避免"链接地址 + 宿主页标题"错配）
const captureFromTab = async (tab, fallbackUrl = '', fallbackTitle = '') => {
  const url = fallbackUrl || tab?.url || ''
  if (!isHttpUrl(url)) {
    return false
  }

  await writePendingCapture({
    url,
    title: fallbackTitle || tab?.title || url,
    source: 'context-or-command'
  })
  return true
}

const ensureContextMenu = () => {
  if (!chrome.contextMenus?.create) {
    return
  }

  // 标题硬编码英文：补齐 _locales + chrome.i18n.getMessage 需要新增 locale 目录、
  // 同步 manifest default_locale 并在两个 manifest 中维护多语言，改动面大；
  // 右键菜单属于低频入口，暂维持英文。如需多语言可后续按 _locales 方案补齐。
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Add page to StarNav',
      contexts: ['page', 'link']
    })
  })
}

// 统一兜底异步捕获：captureFromTab / storage.set 任一失败时置 '!' 徽标并告警，
// 避免裸 rejection 在 service worker 里静默丢失（第 15 轮审查）。
const runCapture = async (capture) => {
  try {
    await capture()
  } catch (error) {
    console.warn('[StarNav] Failed to capture page:', error)
    try {
      await chrome.action?.setBadgeText?.({ text: '!' })
    } catch {
      // Badge failures are non-fatal.
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu()
})

chrome.runtime.onStartup?.addListener?.(() => {
  ensureContextMenu()
})

// Ensure menu exists after service worker restarts (MV3).
ensureContextMenu()

chrome.contextMenus?.onClicked?.addListener?.(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return
  }

  const linkUrl = info.linkUrl
  const targetUrl = linkUrl || info.pageUrl || tab?.url || ''
  // 链接场景：标题用链接 URL 本身（而非宿主页标题），避免"链接地址 + 当前页标题"错配
  await runCapture(() => captureFromTab(tab, targetUrl, linkUrl ? linkUrl : ''))

  try {
    await chrome.action?.openPopup?.()
    // Firefox MV2 无 chrome.action.openPopup，用 browserAction 对称回退（与 badge 一致）
    await chrome.browserAction?.openPopup?.()
  } catch {
    // openPopup is user-gesture gated on some browsers; badge remains as fallback.
  }
})

chrome.commands?.onCommand?.addListener?.(async (command) => {
  if (command !== 'add-current-page') {
    return
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  await runCapture(() => captureFromTab(tabs?.[0]))

  try {
    await chrome.action?.openPopup?.()
    // Firefox MV2 无 chrome.action.openPopup，用 browserAction 对称回退（与 badge 一致）
    await chrome.browserAction?.openPopup?.()
  } catch {
    // Badge fallback.
  }
})
