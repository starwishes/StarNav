import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

import { UPLOADS_DIR } from '../../config/index.js'
import { settingsService } from './settingsService.js'
import { errors } from '../../utils/errors.js'
import { logger } from '../../utils/logger.js'
import { parseImageData } from './systemAssetImageCodec.js'

const SETTINGS_FILE_KEYS = ['backgroundUrl', 'logoUrl', 'faviconUrl']

const randomFileToken = () => crypto.randomBytes(4).toString('hex')

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

const removeDanglingUploadSettings = (filename: string) => {
  const fileUrl = `/uploads/${filename}`

  SETTINGS_FILE_KEYS.forEach((key) => {
    if (settingsService.get(key, '') === fileUrl) {
      if (!settingsService.set(key, '')) {
        logger.warn(`清除悬空上传设置失败: ${key}`)
      }
    }
  })
}

export const systemAssetService = {
  uploadBackground(data: string) {
    const { ext, buffer } = parseImageData(data, ['jpg', 'png', 'gif', 'webp'])

    const filename = `bg_${Date.now()}_${randomFileToken()}.${ext}`
    ensureUploadsDir()
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer)

    const url = `/uploads/${filename}`
    if (!settingsService.set('backgroundUrl', url)) {
      // 设置保存失败时回滚已写入的文件，避免留下孤儿资源；
      // 并抛 500 让前端收到失败，而不是 200 假成功。
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, filename))
      } catch (cleanupError) {
        logger.warn('背景图设置保存失败，且文件回滚删除失败', { url, error: cleanupError })
      }
      logger.error('背景图设置保存失败，已回滚删除文件', { url })
      throw errors.internal('背景图设置保存失败')
    }
    return { url }
  },

  uploadIcon(data: string) {
    const { ext, buffer } = parseImageData(data, ['jpg', 'png', 'gif', 'webp', 'ico'])

    const filename = `icon_${Date.now()}_${randomFileToken()}.${ext}`
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
