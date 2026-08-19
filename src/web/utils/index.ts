import { isSafeHttpUrl, isSafeRelativePath } from '../../shared/security/urlSafety.js'

// 打开页面
export function openUrl(url: string) {
  const candidate = typeof url === 'string' ? url.trim() : ''

  // Stored-XSS guard: never pass javascript:/data:/vbscript: etc. to window.open.
  // Only http(s) URLs and site-relative paths are allowed.
  if (!candidate || (!isSafeHttpUrl(candidate) && !isSafeRelativePath(candidate))) {
    return
  }

  // noopener/noreferrer prevents reverse tabnabbing.
  window.open(candidate, '_blank', 'noopener,noreferrer')
}
