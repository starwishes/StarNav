const getPageDetails = () => {
  const description =
    document.querySelector('meta[name="description"]')?.content ||
    document.querySelector('meta[property="og:description"]')?.content ||
    document.querySelector('meta[name="twitter:description"]')?.content ||
    ''

  return {
    description: description.substring(0, 200)
  }
}

/**
 * Extract meta description from the active tab.
 * Chrome MV3: chrome.scripting; Firefox MV2: tabs.executeScript fallback.
 */
export async function extractActiveTabDetails(tabId) {
  if (!tabId) {
    return { description: '' }
  }

  if (chrome.scripting?.executeScript) {
    const updates = await chrome.scripting.executeScript({
      target: { tabId },
      func: getPageDetails
    })
    return updates?.[0]?.result || { description: '' }
  }

  // Firefox MV2 / older engines
  if (chrome.tabs?.executeScript) {
    const results = await new Promise((resolve, reject) => {
      chrome.tabs.executeScript(
        tabId,
        { code: `(${getPageDetails.toString()})()` },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(injectionResults)
        }
      )
    })
    return results?.[0] || { description: '' }
  }

  return { description: '' }
}
