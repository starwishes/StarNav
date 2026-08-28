// @vitest-environment node

import fs from 'node:fs/promises'
import { inflateRawSync } from 'node:zlib'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { packageExtensionBundles } from '../../scripts/extension/package-extension-bundles.mjs'

const tempDirs = []

const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50

const findEndOfCentralDirectoryOffset = (archiveBuffer) => {
  for (let offset = archiveBuffer.length - 22; offset >= 0; offset -= 1) {
    if (archiveBuffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }

  throw new Error('ZIP end of central directory record not found')
}

const readZipEntries = async (archivePath) => {
  const archiveBuffer = await fs.readFile(archivePath)
  const endOfCentralDirectoryOffset = findEndOfCentralDirectoryOffset(archiveBuffer)
  const entriesCount = archiveBuffer.readUInt16LE(endOfCentralDirectoryOffset + 10)
  let cursor = archiveBuffer.readUInt32LE(endOfCentralDirectoryOffset + 16)
  const entries = new Map()

  for (let index = 0; index < entriesCount; index += 1) {
    if (archiveBuffer.readUInt32LE(cursor) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('ZIP central directory entry not found')
    }

    const compressionMethod = archiveBuffer.readUInt16LE(cursor + 10)
    const compressedSize = archiveBuffer.readUInt32LE(cursor + 20)
    const fileNameLength = archiveBuffer.readUInt16LE(cursor + 28)
    const extraFieldLength = archiveBuffer.readUInt16LE(cursor + 30)
    const commentLength = archiveBuffer.readUInt16LE(cursor + 32)
    const localHeaderOffset = archiveBuffer.readUInt32LE(cursor + 42)
    const fileName = archiveBuffer.slice(cursor + 46, cursor + 46 + fileNameLength).toString('utf8')

    if (archiveBuffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_SIGNATURE) {
      throw new Error(`ZIP local file header not found for ${fileName}`)
    }

    const localFileNameLength = archiveBuffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraFieldLength = archiveBuffer.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength
    const compressedContent = archiveBuffer.slice(dataStart, dataStart + compressedSize)
    const content =
      compressionMethod === 8 ? inflateRawSync(compressedContent) : Buffer.from(compressedContent)

    entries.set(fileName, content)
    cursor += 46 + fileNameLength + extraFieldLength + commentLength
  }

  return entries
}

describe('extension package bundles', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dirPath) => fs.rm(dirPath, { recursive: true, force: true }))
    )
  })

  it('packages downloadable Chrome and Firefox zip archives plus checksums', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'starnav-extension-package-'))
    tempDirs.push(packageRoot)

    const { chromeArchivePath, firefoxArchivePath, checksumsPath } = await packageExtensionBundles({
      outputDir: packageRoot,
      syncMetadata: false
    })

    const [chromeEntries, firefoxEntries, checksums] = await Promise.all([
      readZipEntries(chromeArchivePath),
      readZipEntries(firefoxArchivePath),
      fs.readFile(checksumsPath, 'utf8')
    ])

    expect(chromeEntries.has('manifest.json')).toBe(true)
    expect(chromeEntries.has('popup/popup.html')).toBe(true)
    expect(chromeEntries.has('manifest.firefox.json')).toBe(false)
    // Never nest previously built archives (recursive package bloat)
    expect([...chromeEntries.keys()].some((name) => name.startsWith('packages/'))).toBe(false)
    expect(firefoxEntries.has('manifest.json')).toBe(true)
    expect(firefoxEntries.has('options/options.html')).toBe(false)
    expect([...firefoxEntries.keys()].some((name) => name.startsWith('packages/'))).toBe(false)

    expect(JSON.parse(chromeEntries.get('manifest.json').toString('utf8'))).toMatchObject({
      manifest_version: 3,
      version_name: 'v1.0.6'
    })
    expect(JSON.parse(firefoxEntries.get('manifest.json').toString('utf8'))).toMatchObject({
      manifest_version: 2
    })

    expect(checksums).toContain('starnav-extension-chrome.zip')
    expect(checksums).toContain('starnav-extension-firefox.zip')
  })
})
