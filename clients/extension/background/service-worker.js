const CONTEXT_MENU_ID = 'starnav-add-page'
const PENDING_CAPTURE_KEY = 'pendingCapture'

const isHttpUrl = (value) =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))

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

const captureFromTab = async (tab, fallbackUrl = '') => {
  const url = fallbackUrl || tab?.url || ''
  if (!isHttpUrl(url)) {
    return false
  }

  await writePendingCapture({
    url,
    title: tab?.title || url,
    source: 'context-or-command'
  })
  return true
}

const ensureContextMenu = () => {
  if (!chrome.contextMenus?.create) {
    return
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Add page to StarNav',
      contexts: ['page', 'link']
    })
  })
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

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || ''
  await captureFromTab(tab, targetUrl)

  try {
    await chrome.action?.openPopup?.()
  } catch {
    // openPopup is user-gesture gated on some browsers; badge remains as fallback.
  }
})

chrome.commands?.onCommand?.addListener?.(async (command) => {
  if (command !== 'add-current-page') {
    return
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  await captureFromTab(tabs?.[0])

  try {
    await chrome.action?.openPopup?.()
  } catch {
    // Badge fallback.
  }
})
