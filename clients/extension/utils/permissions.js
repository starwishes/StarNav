const normalizeServerUrl = (serverUrl) =>
  String(serverUrl || '')
    .trim()
    .replace(/\/+$/, '')

export const originPatternFromServerUrl = (serverUrl) => {
  const normalized = normalizeServerUrl(serverUrl)
  if (!normalized) {
    return ''
  }

  try {
    return `${new URL(normalized).origin}/*`
  } catch {
    return ''
  }
}

/**
 * Request host access for the configured StarNav origin only (no permanent <all_urls>).
 */
export async function ensureHostPermission(serverUrl) {
  const originPattern = originPatternFromServerUrl(serverUrl)
  if (!originPattern) {
    return false
  }

  if (!globalThis.chrome?.permissions?.request) {
    // Unit tests / environments without the permissions API.
    return true
  }

  try {
    const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] })
    if (alreadyGranted) {
      return true
    }
  } catch {
    // Some browsers throw when querying optional hosts; fall through to request.
  }

  try {
    return await chrome.permissions.request({ origins: [originPattern] })
  } catch {
    return false
  }
}
