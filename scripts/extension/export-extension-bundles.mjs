import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { syncVersionMetadata } from '../release/sync-version-metadata.mjs'
import { syncExtensionCommon } from './sync-extension-common.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')

const EXTENSION_SOURCE_DIR = path.join(REPO_ROOT, 'clients/extension')
const EXTENSION_EXPORT_ROOT = path.join(EXTENSION_SOURCE_DIR, 'dist')
const CHROME_MANIFEST_PATH = path.join(EXTENSION_SOURCE_DIR, 'manifest.json')
const FIREFOX_MANIFEST_PATH = path.join(EXTENSION_SOURCE_DIR, 'manifest.firefox.json')
// packages/ holds previously built zips — must not be nested into the next export (zip-in-zip bloat)
const EXCLUDED_TOP_LEVEL_NAMES = new Set([
  'README.md',
  'version.json',
  'manifest.firefox.json',
  'dist',
  'packages'
])

const resolveRepoPath = (repoRoot, absolutePath) =>
  path.join(repoRoot, path.relative(REPO_ROOT, absolutePath))

const writeJson = async (filePath, value) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const copyBundleSource = async (sourceDir, destinationDir) => {
  await fs.rm(destinationDir, { recursive: true, force: true })
  await fs.mkdir(destinationDir, { recursive: true })

  const entries = await fs.readdir(sourceDir, { withFileTypes: true })

  await Promise.all(
    entries
      .filter((entry) => !EXCLUDED_TOP_LEVEL_NAMES.has(entry.name))
      .map((entry) =>
        fs.cp(path.join(sourceDir, entry.name), path.join(destinationDir, entry.name), {
          recursive: true
        })
      )
  )
}

export const getExtensionExportPaths = ({ repoRoot = REPO_ROOT, outputDir } = {}) => {
  const sourceDir = resolveRepoPath(repoRoot, EXTENSION_SOURCE_DIR)
  const exportRoot = outputDir || resolveRepoPath(repoRoot, EXTENSION_EXPORT_ROOT)

  return {
    sourceDir,
    exportRoot,
    chromeDir: path.join(exportRoot, 'chrome'),
    firefoxDir: path.join(exportRoot, 'firefox'),
    chromeManifestPath: resolveRepoPath(repoRoot, CHROME_MANIFEST_PATH),
    firefoxManifestPath: resolveRepoPath(repoRoot, FIREFOX_MANIFEST_PATH)
  }
}

export const exportExtensionBundles = async ({
  repoRoot = REPO_ROOT,
  outputDir,
  syncMetadata = true,
  /** Keep clients/extension/common/*.js aligned with root common/*.ts before packaging */
  syncCommon = true
} = {}) => {
  if (syncMetadata) {
    await syncVersionMetadata(repoRoot)
  }

  if (syncCommon) {
    const commonResults = await syncExtensionCommon({ repoRoot, check: false })
    const updated = commonResults.filter((item) => item.changed || item.missing)
    if (updated.length > 0) {
      console.log(
        `[extension:export] synced common → clients/extension/common (${updated
          .map((item) => item.name)
          .join(', ')})`
      )
    }
  }

  const paths = getExtensionExportPaths({ repoRoot, outputDir })
  const [chromeManifest, firefoxManifest] = await Promise.all([
    fs.readFile(paths.chromeManifestPath, 'utf8').then((content) => JSON.parse(content)),
    fs.readFile(paths.firefoxManifestPath, 'utf8').then((content) => JSON.parse(content))
  ])

  await fs.rm(paths.exportRoot, { recursive: true, force: true })
  await Promise.all([
    copyBundleSource(paths.sourceDir, paths.chromeDir),
    copyBundleSource(paths.sourceDir, paths.firefoxDir)
  ])
  await Promise.all([
    writeJson(path.join(paths.chromeDir, 'manifest.json'), chromeManifest),
    writeJson(path.join(paths.firefoxDir, 'manifest.json'), firefoxManifest)
  ])

  return paths
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  const { chromeDir, firefoxDir } = await exportExtensionBundles()
  console.log(`[extension:export] prepared ${path.relative(REPO_ROOT, chromeDir)}`)
  console.log(`[extension:export] prepared ${path.relative(REPO_ROOT, firefoxDir)}`)
}
