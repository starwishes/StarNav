import fs from 'fs'
import path from 'path'

import { UPLOADS_DIR } from '../../config/index.js'
import { settingsService } from './settingsService.js'
import { errors } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { parseImageData } from './systemAssetImageCodec.js'

const SETTINGS_FILE_KEYS = ['backgroundUrl', 'logoUrl', 'faviconUrl']

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
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
