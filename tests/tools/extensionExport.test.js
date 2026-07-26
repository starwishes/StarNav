// @vitest-environment node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { exportExtensionBundles } from '../../scripts/extension/export-extension-bundles.mjs'

const tempDirs = []

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))

const exists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

describe('extension export bundles', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dirPath) => fs.rm(dirPath, { recursive: true, force: true }))
    )
  })

  it('exports installable Chrome and Firefox directories with manifest.json files', async () => {
    const exportRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'starnav-extension-export-'))
    tempDirs.push(exportRoot)

    const { chromeDir, firefoxDir } = await exportExtensionBundles({
      outputDir: exportRoot,
      syncMetadata: false
    })

    const [chromeManifest, firefoxManifest] = await Promise.all([
      readJson(path.join(chromeDir, 'manifest.json')),
      readJson(path.join(firefoxDir, 'manifest.json'))
    ])

    expect(chromeManifest.manifest_version).toBe(3)
    expect(firefoxManifest.manifest_version).toBe(2)
    expect(chromeManifest.version_name).toBe('v1')
    expect(firefoxManifest.browser_specific_settings?.gecko?.id).toBe('starnav@example.com')

    await expect(exists(path.join(chromeDir, 'popup', 'popup.html'))).resolves.toBe(true)
    await expect(exists(path.join(firefoxDir, 'options', 'options.html'))).resolves.toBe(true)
    await expect(exists(path.join(chromeDir, 'manifest.firefox.json'))).resolves.toBe(false)
    await expect(exists(path.join(firefoxDir, 'manifest.firefox.json'))).resolves.toBe(false)
    await expect(exists(path.join(chromeDir, 'README.md'))).resolves.toBe(false)
    await expect(exists(path.join(firefoxDir, 'version.json'))).resolves.toBe(false)
    await expect(exists(path.join(chromeDir, 'packages'))).resolves.toBe(false)
    await expect(exists(path.join(firefoxDir, 'packages'))).resolves.toBe(false)
  })
})
