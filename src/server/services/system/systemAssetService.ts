import fs from 'fs'
import path from 'path'

import { UPLOADS_DIR } from '../../config/index.js'
import { settingsService } from './settingsService.js'
import { errors } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
const SETTINGS_FILE_KEYS = ['backgroundUrl', 'logoUrl', 'faviconUrl']
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 4096
const MAX_IMAGE_PIXELS = 16 * 1024 * 1024
const IMAGE_DATA_URI_PATTERN = /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i
const IMAGE_TYPE_ALIASES: Record<string, string> = {
  jpeg: 'jpg',
  jpg: 'jpg',
  pjpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  webp: 'webp',
  ico: 'ico',
  'x-icon': 'ico',
  'vnd.microsoft.icon': 'ico'
}

type ImageExt = string
type ImageDimensions = { width: number; height: number }

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

const normalizeDeclaredImageType = (value: unknown) =>
  IMAGE_TYPE_ALIASES[String(value || '').toLowerCase()] || ''

const hasPngSignature = (buffer: Buffer) =>
  buffer.length >= 8 &&
  buffer[0] === 0x89 &&
  buffer[1] === 0x50 &&
  buffer[2] === 0x4e &&
  buffer[3] === 0x47 &&
  buffer[4] === 0x0d &&
  buffer[5] === 0x0a &&
  buffer[6] === 0x1a &&
  buffer[7] === 0x0a

const hasJpgSignature = (buffer: Buffer) =>
  buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff

const hasGifSignature = (buffer: Buffer) =>
  buffer.length >= 6 &&
  ((buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    buffer[4] === 0x37 &&
    buffer[5] === 0x61) ||
    (buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      buffer[4] === 0x39 &&
      buffer[5] === 0x61))

const hasWebpSignature = (buffer: Buffer) =>
  buffer.length >= 12 &&
  buffer.toString('ascii', 0, 4) === 'RIFF' &&
  buffer.toString('ascii', 8, 12) === 'WEBP'

const hasIcoSignature = (buffer: Buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x00 &&
  buffer[1] === 0x00 &&
  buffer[2] === 0x01 &&
  buffer[3] === 0x00

const detectImageType = (buffer: Buffer) => {
  if (hasPngSignature(buffer)) {
    return 'png'
  }

  if (hasJpgSignature(buffer)) {
    return 'jpg'
  }

  if (hasGifSignature(buffer)) {
    return 'gif'
  }

  if (hasWebpSignature(buffer)) {
    return 'webp'
  }

  if (hasIcoSignature(buffer)) {
    return 'ico'
  }

  return ''
}

const parsePngDimensions = (buffer: Buffer) => {
  if (buffer.length < 24) {
    return null
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

const parseGifDimensions = (buffer: Buffer) => {
  if (buffer.length < 10) {
    return null
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8)
  }
}

const parseIcoDimensions = (buffer: Buffer) => {
  if (buffer.length < 22) {
    return null
  }

  const imageCount = buffer.readUInt16LE(4)
  if (imageCount < 1) {
    return null
  }

  let width = 0
  let height = 0
  for (let index = 0; index < imageCount; index += 1) {
    const offset = 6 + index * 16
    if (offset + 16 > buffer.length) {
      return null
    }

    width = Math.max(width, buffer[offset] || 256)
    height = Math.max(height, buffer[offset + 1] || 256)
  }

  return { width, height }
}

const parseJpegDimensions = (buffer: Buffer) => {
  if (buffer.length < 4) {
    return null
  }

  const SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ])

  let offset = 2
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1
    }

    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1
    }

    if (offset >= buffer.length) {
      return null
    }

    const marker = buffer[offset]
    offset += 1

    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue
    }

    if (marker === 0xd9 || marker === 0xda) {
      return null
    }

    if (offset + 1 >= buffer.length) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null
    }

    if (SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        return null
      }

      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3)
      }
    }

    offset += segmentLength
  }

  return null
}

const parseWebpDimensions = (buffer: Buffer) => {
  if (
    buffer.length < 30 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null
  }

  const chunkType = buffer.toString('ascii', 12, 16)

  if (chunkType === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    }
  }

  if (chunkType === 'VP8 ') {
    if (buffer.length < 30 || buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return null
    }

    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    }
  }

  if (chunkType === 'VP8L') {
    if (buffer.length < 25 || buffer[20] !== 0x2f) {
      return null
    }

    const width = 1 + (((buffer[22] & 0x3f) << 8) | buffer[21])
    const height =
      1 + (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6))

    return { width, height }
  }

  return null
}

const readImageDimensions = (buffer: Buffer, ext: ImageExt) => {
  switch (ext) {
    case 'png':
      return parsePngDimensions(buffer)
    case 'jpg':
      return parseJpegDimensions(buffer)
    case 'gif':
      return parseGifDimensions(buffer)
    case 'webp':
      return parseWebpDimensions(buffer)
    case 'ico':
      return parseIcoDimensions(buffer)
    default:
      return null
  }
}

const ensureReasonableImageDimensions = (dimensions: ImageDimensions | null | undefined) => {
  if (!dimensions?.width || !dimensions?.height) {
    throw errors.badRequest('图片内容无效')
  }

  if (
    dimensions.width > MAX_IMAGE_DIMENSION ||
    dimensions.height > MAX_IMAGE_DIMENSION ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    throw errors.badRequest(`图片尺寸不能超过 ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`)
  }
}

const decodeBase64Payload = (value: unknown) => {
  const normalized = String(value || '').replace(/\s+/g, '')
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw errors.badRequest('格式不正确')
  }

  return Buffer.from(normalized, 'base64')
}

const parseImageData = (data: string | undefined | null, allowedExts: string[]) => {
  const matches = data?.match(IMAGE_DATA_URI_PATTERN)
  if (!matches) {
    throw errors.badRequest('格式不正确')
  }

  const declaredExt = normalizeDeclaredImageType(matches[1])
  if (!declaredExt) {
    throw errors.badRequest('不支持的文件格式')
  }

  ensureAllowedExt(declaredExt, allowedExts)

  const buffer = decodeBase64Payload(matches[2])
  if (!buffer.length) {
    throw errors.badRequest('图片内容无效')
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw errors.badRequest('图片大小不能超过 5MB')
  }

  const detectedExt = detectImageType(buffer)
  if (!detectedExt) {
    throw errors.badRequest('图片内容无效')
  }

  ensureAllowedExt(detectedExt, allowedExts)

  if (declaredExt !== detectedExt) {
    throw errors.badRequest('图片内容与声明格式不一致')
  }

  ensureReasonableImageDimensions(readImageDimensions(buffer, detectedExt))

  return {
    ext: detectedExt,
    buffer
  }
}

const ensureAllowedExt = (ext: string, allowedExts: string[]) => {
  if (!allowedExts.includes(ext)) {
    throw errors.badRequest('不支持的文件格式')
  }
}

const removeDanglingUploadSettings = (filename: string) => {
  const fileUrl = `/uploads/${filename}`

  SETTINGS_FILE_KEYS.forEach((key) => {
    if (settingsService.get(key, '') === fileUrl) {
      settingsService.set(key, '')
    }
  })
}

export const systemAssetService = {
  uploadBackground(data: string) {
    const { ext, buffer } = parseImageData(data, ['jpg', 'png', 'gif', 'webp'])

    const filename = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    ensureUploadsDir()
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)

    const url = `/uploads/${filename}`
    settingsService.set('backgroundUrl', url)
    return { url }
  },

  uploadIcon(data: string) {
    const { ext, buffer } = parseImageData(data, ['jpg', 'png', 'gif', 'webp', 'ico'])

    const filename = `icon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    ensureUploadsDir()
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)

    return {
      url: `/uploads/${filename}`
    }
  },

  getUploads() {
    try {
      ensureUploadsDir()
      const files = fs
        .readdirSync(UPLOADS_DIR)
        .filter((filename) => /\.(jpg|jpeg|png|gif|webp|ico)$/i.test(filename))
        .map((filename) => {
          const stat = fs.statSync(path.join(UPLOADS_DIR, filename))
          return {
            filename,
            url: `/uploads/${filename}`,
            size: stat.size,
            uploadedAt: stat.mtime.toISOString()
          }
        })
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

      return { files }
    } catch (error) {
      logger.error('获取上传列表失败', error)
      return { files: [] }
    }
  },

  deleteUpload(filename: string) {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw errors.badRequest('无效的文件名')
    }

    const filePath = path.join(UPLOADS_DIR, filename)
    if (!fs.existsSync(filePath)) {
      throw errors.notFound('文件不存在')
    }

    try {
      fs.unlinkSync(filePath)
      removeDanglingUploadSettings(filename)
      logger.info(`文件已删除: ${filename}`)
      return undefined
    } catch (error) {
      logger.error('删除文件失败', error)
      throw errors.internal('删除失败')
    }
  }
}
