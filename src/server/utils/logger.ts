// 日志级别：0=silent, 1=error, 2=warn, 3=info (默认), 4=debug
const LOG_LEVEL = parseInt(process.env.LOG_LEVEL || '3', 10)

export interface BackendLogger {
  debug: (msg: string, data?: unknown) => void
  info: (msg: string, data?: unknown) => void
  warn: (msg: string, data?: unknown) => void
  error: (msg: string, err?: unknown) => void
}

/**
 * 统一日志工具 (Logger)
 * 支持多级别日志输出，受环境变量 LOG_LEVEL 控制
 */
export const logger: BackendLogger = {
  debug: (msg, data = {}) => {
    if (LOG_LEVEL >= 4) console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data)
  },
  info: (msg, data = {}) => {
    if (LOG_LEVEL >= 3) console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data)
  },
  warn: (msg, data = {}) => {
    if (LOG_LEVEL >= 2) console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data)
  },
  error: (msg, err = {}) => {
    if (LOG_LEVEL >= 1) console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err)
  }
}
