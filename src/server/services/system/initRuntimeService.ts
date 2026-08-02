import fs from 'fs'

import { DATA_DIR, UPLOADS_DIR, validateEnv } from '../../config/index.js'
import { logger } from '../../utils/logger.js'

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export const initRuntimeService = {
  prepareRuntime() {
    validateEnv()

    ensureDir(DATA_DIR)
    ensureDir(UPLOADS_DIR)

    if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
      logger.warn('⚠️ 严重安全警告: 生产环境未配置 CORS_ORIGINS!')
      logger.warn('   当前仅允许同源 Web 请求和浏览器扩展来源，跨域 Web 管理访问会被拒绝。')
      logger.warn(
        '   请务必在 docker/docker-compose.yml 或 .env 中设置 CORS_ORIGINS=https://your-domain.com'
      )
    }
  }
}
