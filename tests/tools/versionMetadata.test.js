// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { describe, expect, it } from 'vitest'

import {
  VERSION_SYNC_END_MARKER,
  VERSION_SYNC_START_MARKER,
  buildFirefoxManifest,
  checkVersionMetadata,
  renderExtensionReadmeVersionSection,
  renderRootReadmeVersionSection,
  syncVersionMetadata
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

  it('converts chrome commands and string CSP into the firefox manifest', () => {
    const chromeManifest = {
      name: 'StarNav',
      version: '1.0.2',
      description: 'Test',
      permissions: ['bookmarks', 'tabs', 'host'],
      host_permissions: ['https://example.com/*', 'scripting'],
      action: {
        default_popup: 'popup/index.html',
        default_title: 'StarNav',
        default_icon: { 16: 'i.png' }
      },
      icons: { 16: 'i.png' },
      options_ui: { page: 'options/index.html' },
      background: { service_worker: 'background/service-worker.js' },
      content_security_policy: "script-src 'self'",
      commands: {
        _execute_action: { suggested_key: { default: 'Ctrl+Shift+K' } },
        toggle: { suggested_key: { default: 'Alt+T' } }
      }
    }

    const firefox = buildFirefoxManifest(chromeManifest)

    expect(firefox.manifest_version).toBe(2)
    expect(firefox.browser_action.default_title).toBe('StarNav')
    expect(firefox.background.scripts).toEqual(['background/service-worker.js'])
    expect(firefox.commands._execute_browser_action).toBeDefined()
    expect(firefox.commands.toggle).toBeDefined()
    expect(firefox.content_security_policy).toBe("script-src 'self'")
    expect(firefox.permissions).toEqual(['bookmarks', 'tabs', 'host', 'https://example.com/*'])
  })

  it('omits commands and background when the chrome manifest lacks them', () => {
    const firefox = buildFirefoxManifest({
      name: 'StarNav',
      version: '1.0.2',
      description: 'x',
      action: { default_popup: 'popup/index.html' },
      background: { scripts: ['bg.js'] }
    })

    expect(firefox.commands).toBeUndefined()
    expect(firefox.background).toEqual({ scripts: ['bg.js'], persistent: false })
  })

  it('syncs metadata on a temp repo and propagates versions to manifests and READMEs', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starnav-version-sync-'))
    const write = (relative, content) => {
      const target = path.join(repoRoot, relative)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content, 'utf8')
    }

    write('package.json', JSON.stringify({ version: '9.9.9' }))
    write(
      'clients/extension/version.json',
      JSON.stringify({ packageVersion: '9.9.9', displayVersion: 'v9.9.9' })
    )
    write(
      'clients/extension/manifest.json',
      JSON.stringify({ name: 'StarNav', version: '0.0.1', description: 'x' })
    )
    write('clients/extension/manifest.firefox.json', '{}')
    write('README.md', `${VERSION_SYNC_START_MARKER}\n\nold\n${VERSION_SYNC_END_MARKER}`)
    write(
      'clients/extension/README.md',
      `${VERSION_SYNC_START_MARKER}\n\nold\n${VERSION_SYNC_END_MARKER}`
    )

    const updated = await syncVersionMetadata(repoRoot)
    expect(updated.length).toBeGreaterThan(0)

    const chromeManifest = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'clients/extension/manifest.json'), 'utf8')
    )
    expect(chromeManifest.version).toBe('9.9.9')
    expect(chromeManifest.version_name).toBe('v9.9.9')

    const rootReadme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8')
    expect(rootReadme).toContain('主站：`v9.9.9`')

    fs.rmSync(repoRoot, { recursive: true, force: true })
  })

  it('rejects a temp repo whose extension version.json is missing fields', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'starnav-version-bad-'))
    const write = (relative, content) => {
      const target = path.join(repoRoot, relative)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content, 'utf8')
    }

    write('package.json', JSON.stringify({ version: '1.0.0' }))
    write('clients/extension/version.json', JSON.stringify({ packageVersion: '1.0.0' }))
    write('clients/extension/manifest.json', JSON.stringify({ name: 'x' }))
    write('clients/extension/manifest.firefox.json', '{}')
    write('README.md', `${VERSION_SYNC_START_MARKER}\n\na\n${VERSION_SYNC_END_MARKER}`)
    write(
      'clients/extension/README.md',
      `${VERSION_SYNC_START_MARKER}\n\na\n${VERSION_SYNC_END_MARKER}`
    )

    await expect(syncVersionMetadata(repoRoot)).rejects.toThrow('displayVersion')
    fs.rmSync(repoRoot, { recursive: true, force: true })
  })
})
