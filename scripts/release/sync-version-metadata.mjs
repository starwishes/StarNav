import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')

const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json')
const EXTENSION_VERSION_PATH = path.join(REPO_ROOT, 'clients/extension', 'version.json')
const ROOT_README_PATH = path.join(REPO_ROOT, 'README.md')
const EXTENSION_README_PATH = path.join(REPO_ROOT, 'clients/extension', 'README.md')
const CHROME_MANIFEST_PATH = path.join(REPO_ROOT, 'clients/extension', 'manifest.json')
const FIREFOX_MANIFEST_PATH = path.join(REPO_ROOT, 'clients/extension', 'manifest.firefox.json')
const FIREFOX_GECKO_SETTINGS = {
  gecko: {
    id: 'starnav@example.com',
    // 代码使用可选链/空值合并等 ES2020 特性，Firefox 需 ≥74。
    strict_min_version: '74.0'
  }
}
const FIREFOX_UNSUPPORTED_PERMISSIONS = new Set(['scripting'])

export const VERSION_SYNC_START_MARKER = '<!-- version-sync:start -->'
export const VERSION_SYNC_END_MARKER = '<!-- version-sync:end -->'

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))

const writeJson = async (filePath, value) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const resolveRepoPath = (repoRoot, absolutePath) =>
  path.join(repoRoot, path.relative(REPO_ROOT, absolutePath))

const serializeJson = (value) => `${JSON.stringify(value, null, 2)}\n`

const pruneUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.map(pruneUndefined).filter((entry) => entry !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, pruneUndefined(entry)])
    )
  }

  return value
}

const replaceManagedSection = (content, nextSection) => {
  const pattern = new RegExp(
    `${VERSION_SYNC_START_MARKER}[\\s\\S]*?${VERSION_SYNC_END_MARKER}`,
    'm'
  )

  if (!pattern.test(content)) {
    throw new Error(`Managed version section markers not found in content.`)
  }

  return content.replace(
    pattern,
    // 末尾保留空行：prettier 会把 HTML 注释前的空行保持为规范格式，
    // 脚本输出若不匹配会导致 versions:check 反复漂移
    `${VERSION_SYNC_START_MARKER}\n\n${nextSection}\n\n${VERSION_SYNC_END_MARKER}`
  )
}

export const renderRootReadmeVersionSection = (appVersion, extensionDisplayVersion) => `## 当前版本

- 主站：\`v${appVersion}\`
- 浏览器扩展：\`${extensionDisplayVersion}\``

export const renderExtensionReadmeVersionSection = (
  extensionDisplayVersion,
  extensionPackageVersion
) => `## 当前版本

- 插件版本：\`${extensionDisplayVersion}\`
- Manifest 包版本：\`${extensionPackageVersion}\``

const buildFirefoxPermissions = (chromeManifest) => {
  const permissions = [
    ...(Array.isArray(chromeManifest.permissions) ? chromeManifest.permissions : []),
    ...(Array.isArray(chromeManifest.host_permissions) ? chromeManifest.host_permissions : [])
  ]

  return permissions.filter(
    (permission, index) =>
      !FIREFOX_UNSUPPORTED_PERMISSIONS.has(permission) && permissions.indexOf(permission) === index
  )
}

const buildFirefoxCommands = (chromeManifest) => {
  if (!chromeManifest.commands || typeof chromeManifest.commands !== 'object') {
    return undefined
  }

  const entries = Object.entries(chromeManifest.commands)
  if (!entries.length) {
    return undefined
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [
      key === '_execute_action' ? '_execute_browser_action' : key,
      value
    ])
  )
}

const buildFirefoxContentSecurityPolicy = (chromeManifest) => {
  const policy = chromeManifest.content_security_policy

  if (typeof policy === 'string') {
    return policy
  }

  if (policy && typeof policy === 'object' && typeof policy.extension_pages === 'string') {
    return policy.extension_pages
  }

  return undefined
}

export const buildFirefoxManifest = (chromeManifest) =>
  pruneUndefined({
    manifest_version: 2,
    name: chromeManifest.name,
    version: chromeManifest.version,
    description: chromeManifest.description,
    permissions: buildFirefoxPermissions(chromeManifest),
    browser_action: {
      default_popup: chromeManifest.action?.default_popup,
      default_title: chromeManifest.action?.default_title,
      default_icon: chromeManifest.action?.default_icon
    },
    icons: chromeManifest.icons ?? chromeManifest.action?.default_icon,
    options_ui: chromeManifest.options_ui,
    background: chromeManifest.background?.service_worker
      ? {
          scripts: [chromeManifest.background.service_worker],
          persistent: false
        }
      : Array.isArray(chromeManifest.background?.scripts)
        ? {
            scripts: chromeManifest.background.scripts,
            persistent: false
          }
        : undefined,
    content_security_policy: buildFirefoxContentSecurityPolicy(chromeManifest),
    commands: buildFirefoxCommands(chromeManifest),
    browser_specific_settings: FIREFOX_GECKO_SETTINGS
  })

const buildVersionOutputs = async (repoRoot = REPO_ROOT) => {
  const packageJsonPath = resolveRepoPath(repoRoot, PACKAGE_JSON_PATH)
  const extensionVersionPath = resolveRepoPath(repoRoot, EXTENSION_VERSION_PATH)
  const rootReadmePath = resolveRepoPath(repoRoot, ROOT_README_PATH)
  const extensionReadmePath = resolveRepoPath(repoRoot, EXTENSION_README_PATH)
  const chromeManifestPath = resolveRepoPath(repoRoot, CHROME_MANIFEST_PATH)
  const firefoxManifestPath = resolveRepoPath(repoRoot, FIREFOX_MANIFEST_PATH)

  const [{ version: appVersion }, extensionVersion] = await Promise.all([
    readJson(packageJsonPath),
    readJson(extensionVersionPath)
  ])

  if (typeof appVersion !== 'string' || !appVersion) {
    throw new Error(`package.json is missing a valid version string.`)
  }

  const extensionPackageVersion = extensionVersion?.packageVersion
  const extensionDisplayVersion = extensionVersion?.displayVersion

  if (typeof extensionPackageVersion !== 'string' || !extensionPackageVersion) {
    throw new Error(`clients/extension/version.json is missing packageVersion.`)
  }

  if (typeof extensionDisplayVersion !== 'string' || !extensionDisplayVersion) {
    throw new Error(`clients/extension/version.json is missing displayVersion.`)
  }

  const [chromeManifest, firefoxManifest, rootReadme, extensionReadme] = await Promise.all([
    readJson(chromeManifestPath),
    readJson(firefoxManifestPath),
    fs.readFile(rootReadmePath, 'utf8'),
    fs.readFile(extensionReadmePath, 'utf8')
  ])

  const nextChromeManifest = {
    ...chromeManifest,
    version: extensionPackageVersion,
    version_name: extensionDisplayVersion
  }
  const nextFirefoxManifest = buildFirefoxManifest(nextChromeManifest)
  const nextRootReadme = replaceManagedSection(
    rootReadme,
    renderRootReadmeVersionSection(appVersion, extensionDisplayVersion)
  )
  const nextExtensionReadme = replaceManagedSection(
    extensionReadme,
    renderExtensionReadmeVersionSection(extensionDisplayVersion, extensionPackageVersion)
  )

  return {
    paths: {
      chromeManifestPath,
      firefoxManifestPath,
      rootReadmePath,
      extensionReadmePath
    },
    current: {
      chromeManifest,
      firefoxManifest,
      rootReadme,
      extensionReadme
    },
    next: {
      chromeManifest: nextChromeManifest,
      firefoxManifest: nextFirefoxManifest,
      rootReadme: nextRootReadme,
      extensionReadme: nextExtensionReadme
    }
  }
}

export const syncVersionMetadata = async (repoRoot = REPO_ROOT) => {
  const {
    paths: { chromeManifestPath, firefoxManifestPath, rootReadmePath, extensionReadmePath },
    current,
    next
  } = await buildVersionOutputs(repoRoot)
  const isChromeManifestChanged =
    serializeJson(current.chromeManifest) !== serializeJson(next.chromeManifest)
  const isFirefoxManifestChanged =
    serializeJson(current.firefoxManifest) !== serializeJson(next.firefoxManifest)
  const isRootReadmeChanged = current.rootReadme !== next.rootReadme
  const isExtensionReadmeChanged = current.extensionReadme !== next.extensionReadme

  const updates = []

  if (isChromeManifestChanged) {
    updates.push(writeJson(chromeManifestPath, next.chromeManifest))
  }

  if (isFirefoxManifestChanged) {
    updates.push(writeJson(firefoxManifestPath, next.firefoxManifest))
  }

  if (isRootReadmeChanged) {
    updates.push(fs.writeFile(rootReadmePath, next.rootReadme))
  }

  if (isExtensionReadmeChanged) {
    updates.push(fs.writeFile(extensionReadmePath, next.extensionReadme))
  }

  await Promise.all(updates)

  return [chromeManifestPath, firefoxManifestPath, rootReadmePath, extensionReadmePath].filter(
    (filePath) => {
      if (filePath === chromeManifestPath) {
        return isChromeManifestChanged
      }

      if (filePath === firefoxManifestPath) {
        return isFirefoxManifestChanged
      }

      if (filePath === rootReadmePath) {
        return isRootReadmeChanged
      }

      return isExtensionReadmeChanged
    }
  )
}

export const checkVersionMetadata = async (repoRoot = REPO_ROOT) => {
  const {
    paths: { chromeManifestPath, firefoxManifestPath, rootReadmePath, extensionReadmePath },
    current,
    next
  } = await buildVersionOutputs(repoRoot)
  const mismatches = []

  if (serializeJson(current.chromeManifest) !== serializeJson(next.chromeManifest)) {
    mismatches.push(
      `${path.relative(repoRoot, chromeManifestPath)} is out of sync with clients/extension/version.json`
    )
  }

  if (serializeJson(current.firefoxManifest) !== serializeJson(next.firefoxManifest)) {
    mismatches.push(
      `${path.relative(repoRoot, firefoxManifestPath)} is out of sync with generated Firefox manifest`
    )
  }

  const normalizeNewlines = (value) => String(value).replace(/\r\n/g, '\n')

  if (normalizeNewlines(current.rootReadme) !== normalizeNewlines(next.rootReadme)) {
    mismatches.push(
      `${path.relative(repoRoot, rootReadmePath)} has a stale managed version section`
    )
  }

  if (normalizeNewlines(current.extensionReadme) !== normalizeNewlines(next.extensionReadme)) {
    mismatches.push(
      `${path.relative(repoRoot, extensionReadmePath)} has a stale managed version section`
    )
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    checkedPaths: [chromeManifestPath, firefoxManifestPath, rootReadmePath, extensionReadmePath]
  }
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  if (process.argv.includes('--check')) {
    const result = await checkVersionMetadata()

    if (!result.ok) {
      result.mismatches.forEach((mismatch) => {
        console.error(`[versions:check] ${mismatch}`)
      })
      process.exitCode = 1
    } else {
      result.checkedPaths.forEach((filePath) => {
        console.log(`[versions:check] ok ${path.relative(REPO_ROOT, filePath)}`)
      })
    }
  } else {
    const updatedPaths = await syncVersionMetadata()
    updatedPaths.forEach((filePath) => {
      console.log(`[versions:sync] updated ${path.relative(REPO_ROOT, filePath)}`)
    })
  }
}
