// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  VERSION_SYNC_END_MARKER,
  VERSION_SYNC_START_MARKER,
  buildFirefoxManifest,
  checkVersionMetadata,
  renderExtensionReadmeVersionSection,
  renderRootReadmeVersionSection
} from '../../scripts/release/sync-version-metadata.mjs'

const readFile = (relativePath) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(readFile(relativePath))

const extractManagedSection = (content) => {
  const startIndex = content.indexOf(VERSION_SYNC_START_MARKER)
  const endIndex = content.indexOf(VERSION_SYNC_END_MARKER)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('Managed version section markers not found.')
  }

  return content
    .slice(startIndex + VERSION_SYNC_START_MARKER.length, endIndex)
    .replace(/\r\n/g, '\n')
    .trim()
}

describe('version metadata consistency', () => {
  it('keeps browser extension manifests aligned with the extension version source', () => {
    const extensionVersion = readJson('clients/extension/version.json')
    const chromeManifest = readJson('clients/extension/manifest.json')
    const firefoxManifest = readJson('clients/extension/manifest.firefox.json')

    expect(chromeManifest.version).toBe(extensionVersion.packageVersion)
    expect(chromeManifest.version_name).toBe(extensionVersion.displayVersion)
    expect(firefoxManifest).toEqual(buildFirefoxManifest(chromeManifest))
  })

  it('keeps the root and extension READMEs aligned with managed version metadata', () => {
    const packageJson = readJson('package.json')
    const extensionVersion = readJson('clients/extension/version.json')
    const rootReadme = readFile('README.md')
    const extensionReadme = readFile('clients/extension/README.md')

    expect(extractManagedSection(rootReadme)).toBe(
      renderRootReadmeVersionSection(packageJson.version, extensionVersion.displayVersion)
    )
    expect(extractManagedSection(extensionReadme)).toBe(
      renderExtensionReadmeVersionSection(
        extensionVersion.displayVersion,
        extensionVersion.packageVersion
      )
    )
  })

  it('passes the CLI consistency check without mismatches', async () => {
    await expect(checkVersionMetadata()).resolves.toMatchObject({
      ok: true,
      mismatches: []
    })
  })
})
