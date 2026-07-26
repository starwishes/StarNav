/**
 * Safe lint-staged for large renames / Windows:
 * - skip paths that no longer exist (deleted .js after TS migrate)
 * - chunk argv to avoid command-line length limits
 * - sequential tasks to reduce SIGKILL under constrained shells
 */
import fs from 'node:fs'

const CHUNK_SIZE = 20

const existingFiles = (files) =>
  files.filter((file) => {
    try {
      return fs.existsSync(file)
    } catch {
      return false
    }
  })

const chunk = (files, size = CHUNK_SIZE) => {
  const groups = []
  for (let i = 0; i < files.length; i += size) {
    groups.push(files.slice(i, i + size))
  }
  return groups
}

const quote = (file) => `"${String(file).replace(/"/g, '\\"')}"`

const mapChunks = (files, build) => {
  const present = existingFiles(files)
  if (present.length === 0) return []
  return chunk(present).map((group) => build(group.map(quote).join(' ')))
}

const isExtensionSourceFile = (file) => {
  const normalized = String(file).replace(/\\/g, '/')
  if (!normalized.includes('clients/extension/')) {
    return false
  }
  // Generated artifacts — packaging updates these; do not re-trigger on themselves.
  if (normalized.includes('clients/extension/packages/')) {
    return false
  }
  if (normalized.includes('clients/extension/dist/')) {
    return false
  }
  return true
}

export default {
  concurrent: false,
  '*.{js,jsx,ts,tsx,vue}': (files) => [
    ...mapChunks(files, (list) => `eslint --fix ${list}`),
    ...mapChunks(files, (list) => `prettier --write ${list}`)
  ],
  // Ops linters (shfmt/hadolint) stay in CI `lint:ops`, not local hooks
  '*.{css,scss,md,json,yml,yaml}': (files) =>
    mapChunks(files, (list) => `prettier --write ${list}`),
  // Auto-refresh downloadable zips when extension source changes.
  'clients/extension/**/*': (files) => {
    if (!files.some(isExtensionSourceFile)) {
      return []
    }
    return [
      'npm run extension:package',
      'git add clients/extension/packages/SHA256SUMS.txt clients/extension/packages/starnav-extension-chrome.zip clients/extension/packages/starnav-extension-firefox.zip'
    ]
  }
}
