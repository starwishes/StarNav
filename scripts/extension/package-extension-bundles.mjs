/* global console, process */
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { crc32, deflateRawSync } from 'node:zlib'

import { exportExtensionBundles } from './export-extension-bundles.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')

const EXTENSION_SOURCE_DIR = path.join(REPO_ROOT, 'clients/extension')
const EXTENSION_PACKAGE_ROOT = path.join(EXTENSION_SOURCE_DIR, 'packages')
const PACKAGE_TARGETS = [
  {
    bundleName: 'chrome',
    archiveName: 'starnav-extension-chrome.zip'
  },
  {
    bundleName: 'firefox',
    archiveName: 'starnav-extension-firefox.zip'
  }
]

const resolveRepoPath = (repoRoot, absolutePath) =>
  path.join(repoRoot, path.relative(REPO_ROOT, absolutePath))

const normalizeArchivePath = (relativePath) => relativePath.split(path.sep).join('/')

const toDosTimestamp = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  const clampedYear = Math.min(Math.max(date.getFullYear(), 1980), 2107)

  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((clampedYear - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

const walkFiles = async (sourceDir, currentDir = sourceDir) => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const sortedEntries = entries.sort((left, right) => left.name.localeCompare(right.name))
  const nestedFiles = await Promise.all(
    sortedEntries.map(async (entry) => {
      const absolutePath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        return walkFiles(sourceDir, absolutePath)
      }

      return [
        {
          absolutePath,
          relativePath: normalizeArchivePath(path.relative(sourceDir, absolutePath))
        }
      ]
    })
  )

  return nestedFiles.flat()
}

const buildArchiveEntries = async (sourceDir) => {
  const files = await walkFiles(sourceDir)

  return Promise.all(
    files.map(async ({ absolutePath, relativePath }) => {
      const [content, stats] = await Promise.all([fs.readFile(absolutePath), fs.stat(absolutePath)])
      const compressedContent = deflateRawSync(content)
      const shouldCompress = compressedContent.length < content.length
      const archiveContent = shouldCompress ? compressedContent : content
      const nameBuffer = Buffer.from(relativePath, 'utf8')
      const { time, date } = toDosTimestamp(stats.mtime)

      return {
        nameBuffer,
        archiveContent,
        compressionMethod: shouldCompress ? 8 : 0,
        crc32: crc32(content) >>> 0,
        compressedSize: archiveContent.length,
        uncompressedSize: content.length,
        modifiedTime: time,
        modifiedDate: date,
        externalAttributes: (((stats.mode || 0o644) & 0xffff) << 16) >>> 0
      }
    })
  )
}

const createZipArchiveBuffer = (entries) => {
  const localChunks = []
  const centralChunks = []
  let localSize = 0

  for (const entry of entries) {
    const localHeaderOffset = localSize
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(entry.compressionMethod, 8)
    localHeader.writeUInt16LE(entry.modifiedTime, 10)
    localHeader.writeUInt16LE(entry.modifiedDate, 12)
    localHeader.writeUInt32LE(entry.crc32, 14)
    localHeader.writeUInt32LE(entry.compressedSize, 18)
    localHeader.writeUInt32LE(entry.uncompressedSize, 22)
    localHeader.writeUInt16LE(entry.nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localChunks.push(localHeader, entry.nameBuffer, entry.archiveContent)
    localSize += localHeader.length + entry.nameBuffer.length + entry.archiveContent.length

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(0x0314, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(entry.compressionMethod, 10)
    centralHeader.writeUInt16LE(entry.modifiedTime, 12)
    centralHeader.writeUInt16LE(entry.modifiedDate, 14)
    centralHeader.writeUInt32LE(entry.crc32, 16)
    centralHeader.writeUInt32LE(entry.compressedSize, 20)
    centralHeader.writeUInt32LE(entry.uncompressedSize, 24)
    centralHeader.writeUInt16LE(entry.nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(entry.externalAttributes, 38)
    centralHeader.writeUInt32LE(localHeaderOffset, 42)

    centralChunks.push(centralHeader, entry.nameBuffer)
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(entries.length, 8)
  endOfCentralDirectory.writeUInt16LE(entries.length, 10)
  endOfCentralDirectory.writeUInt32LE(centralSize, 12)
  endOfCentralDirectory.writeUInt32LE(localSize, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  const totalSize = localSize + centralSize + endOfCentralDirectory.length

  return Buffer.concat(
    [...localChunks, ...centralChunks, endOfCentralDirectory],
    totalSize
  )
}

const writeZipArchive = async (sourceDir, archivePath) => {
  const entries = await buildArchiveEntries(sourceDir)
  const archiveBuffer = createZipArchiveBuffer(entries)

  await fs.writeFile(archivePath, archiveBuffer)

  return {
    archivePath,
    entryCount: entries.length
  }
}

const renderChecksums = async (filePaths) => {
  const lines = await Promise.all(
    filePaths.map(async (filePath) => {
      const content = await fs.readFile(filePath)
      const digest = createHash('sha256').update(content).digest('hex')

      return `${digest}  ${path.basename(filePath)}`
    })
  )

  return `${lines.join('\n')}\n`
}

export const getExtensionPackagePaths = ({ repoRoot = REPO_ROOT, outputDir } = {}) => {
  const packageRoot = outputDir || resolveRepoPath(repoRoot, EXTENSION_PACKAGE_ROOT)

  return {
    packageRoot,
    chromeArchivePath: path.join(packageRoot, PACKAGE_TARGETS[0].archiveName),
    firefoxArchivePath: path.join(packageRoot, PACKAGE_TARGETS[1].archiveName),
    checksumsPath: path.join(packageRoot, 'SHA256SUMS.txt')
  }
}

export const packageExtensionBundles = async ({
  repoRoot = REPO_ROOT,
  outputDir,
  syncMetadata = true
} = {}) => {
  const packagePaths = getExtensionPackagePaths({ repoRoot, outputDir })
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'starnav-extension-package-'))

  try {
    const exportRoot = path.join(tempRoot, 'export')
    const exportPaths = await exportExtensionBundles({
      repoRoot,
      outputDir: exportRoot,
      syncMetadata
    })

    await fs.rm(packagePaths.packageRoot, { recursive: true, force: true })
    await fs.mkdir(packagePaths.packageRoot, { recursive: true })

    const packagedBundles = await Promise.all(
      PACKAGE_TARGETS.map(({ bundleName, archiveName }) =>
        writeZipArchive(path.join(exportPaths.exportRoot, bundleName), path.join(packagePaths.packageRoot, archiveName))
      )
    )

    await fs.writeFile(
      packagePaths.checksumsPath,
      await renderChecksums(packagedBundles.map(({ archivePath }) => archivePath))
    )

    return {
      ...packagePaths,
      packagedBundles
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  const { chromeArchivePath, firefoxArchivePath, checksumsPath } = await packageExtensionBundles()
  console.log(`[extension:package] prepared ${path.relative(REPO_ROOT, chromeArchivePath)}`)
  console.log(`[extension:package] prepared ${path.relative(REPO_ROOT, firefoxArchivePath)}`)
  console.log(`[extension:package] prepared ${path.relative(REPO_ROOT, checksumsPath)}`)
}
