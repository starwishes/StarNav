import path from 'path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const buildPngBytes = (width = 16, height = 16) =>
  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
    0x08,
    0x02,
    0x00,
    0x00,
    0x00
  ])

const buildIcoBytes = (width = 32, height = 32) =>
  Buffer.from([
    0x00,
    0x00,
    0x01,
    0x00,
    0x01,
    0x00,
    width === 256 ? 0x00 : width,
    height === 256 ? 0x00 : height,
    0x00,
    0x00,
    0x01,
    0x00,
    0x20,
    0x00,
    0x10,
    0x00,
    0x00,
    0x00,
    0x16,
    0x00,
    0x00,
    0x00
  ])

const buildDataUri = (mime, bytes) =>
  `data:image/${mime};base64,${Buffer.from(bytes).toString('base64')}`

const mockSettings = {
  backgroundUrl: '/uploads/old-bg.png',
  logoUrl: '/uploads/icon_1.png',
  faviconUrl: '/uploads/icon_1.png'
}

const settingsService = {
  set: vi.fn(),
  get: vi.fn((key, fallback = '') => (key in mockSettings ? mockSettings[key] : fallback))
}

vi.mock('../../../src/server/services/system/settingsService.js', () => ({
  settingsService
}))

describe('SystemAssetService', () => {
  let systemAssetService
  let testDataDir
  let uploadsDir

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    testDataDir = createTestDataDir('starnav-system-asset-test')
    uploadsDir = path.join(testDataDir, 'uploads')
    fs.mkdirSync(uploadsDir, { recursive: true })
    mockSettings.backgroundUrl = '/uploads/old-bg.png'
    mockSettings.logoUrl = '/uploads/icon_1.png'
    mockSettings.faviconUrl = '/uploads/icon_1.png'
    ;({ systemAssetService } = await import('../../../src/server/services/system/systemAssetService.js'))
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir, { closeDatabase: false })
  })

  it('should upload a background image and persist backgroundUrl', () => {
    const result = systemAssetService.uploadBackground(buildDataUri('png', buildPngBytes()))

    expect(result.url).toMatch(/^\/uploads\/bg_/)
    expect(settingsService.set).toHaveBeenCalledWith('backgroundUrl', result.url)
  })

  it('should reject unsupported icon types', () => {
    expect(() => {
      systemAssetService.uploadIcon('data:image/svg+xml;base64,ZmFrZQ==')
    }).toThrow('不支持的文件格式')
  })

  it('should reject mismatched declared and actual image types', () => {
    expect(() => {
      systemAssetService.uploadBackground(
        buildDataUri('png', Buffer.from([0xff, 0xd8, 0xff, 0x00]))
      )
    }).toThrow('图片内容与声明格式不一致')
  })

  it('should reject oversized uploaded images', () => {
    const oversizedJpg = buildDataUri(
      'jpeg',
      Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)])
    )

    expect(() => {
      systemAssetService.uploadBackground(oversizedJpg)
    }).toThrow('图片大小不能超过 5MB')
  })

  it('accepts normalized ico mime aliases when the file signature matches', () => {
    const result = systemAssetService.uploadIcon(buildDataUri('x-icon', buildIcoBytes()))

    expect(result.url).toMatch(/^\/uploads\/icon_.*\.ico$/)
  })

  it('rejects images whose dimensions exceed the server-side limit', () => {
    expect(() => {
      systemAssetService.uploadBackground(buildDataUri('png', buildPngBytes(4097, 128)))
    }).toThrow('图片尺寸不能超过 4096x4096')
  })

  it('should delete uploads and clear related settings', () => {
    const filePath = path.join(uploadsDir, 'icon_1.png')
    fs.writeFileSync(filePath, 'fake')

    const result = systemAssetService.deleteUpload('icon_1.png')

    expect(result).toEqual(undefined)
    expect(fs.existsSync(filePath)).toBe(false)
    expect(settingsService.set).toHaveBeenCalledWith('logoUrl', '')
    expect(settingsService.set).toHaveBeenCalledWith('faviconUrl', '')
  })
})
