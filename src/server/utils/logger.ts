import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeSync
} from 'node:fs'
import { join } from 'node:path'

// 日志级别：0=silent, 1=error, 2=warn, 3=info (默认), 4=debug
const PARSED_LOG_LEVEL = Number.parseInt(process.env.LOG_LEVEL || '3', 10)
// 非法值（NaN）回退到默认级别 3，避免所有日志被静默关闭
const LOG_LEVEL = Number.isNaN(PARSED_LOG_LEVEL) ? 3 : PARSED_LOG_LEVEL

// 文件日志配置（默认 data/logs/，可通过 LOG_DIR 修改，设置 LOG_FILE=false 关闭）
const LOG_FILE_ENABLED = process.env.LOG_FILE !== 'false'
const LOG_DIR = process.env.LOG_DIR || ''
// 日志文件保留天数（默认 30 天，可通过 LOG_RETENTION_DAYS 修改）
const LOG_RETENTION_DAYS = Math.max(
  1,
  Number.parseInt(process.env.LOG_RETENTION_DAYS || '30', 10) || 30
)

// 同步初始化日志文件路径，避免启动阶段日志丢失
let resolvedLogDir = ''
let todayStr = ''
// 当日文件句柄：复用避免每条日志都做 open/close；跨天时轮转重建
let logFd: number | null = null

const resolveLogDir = (): string => {
  if (LOG_DIR) return LOG_DIR
  const dataDir = process.env.DATA_PATH || join(process.cwd(), 'data')
  return join(dataDir, 'logs')
}

// 清理超过保留天数的历史日志文件（按 mtime 判定，当前文件不会被误删）
const cleanupOldLogs = (dir: string) => {
  try {
    const cutoffMs = Date.now() - LOG_RETENTION_DAYS * 86_400_000
    for (const name of readdirSync(dir)) {
      if (!/^starnav-\d{4}-\d{2}-\d{2}\.log$/.test(name)) continue
      const file = join(dir, name)
      try {
        if (statSync(file).mtimeMs < cutoffMs) {
          unlinkSync(file)
        }
      } catch {
        // 单个文件清理失败不阻塞其余日志
      }
    }
  } catch {
    // 清理失败不影响启动
  }
}

// 本地日期 YYYY-MM-DD（日志文件按本地日期命名/轮转，避免 UTC 与本地时区错位）
const getLocalDateStr = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const initLogFileSync = () => {
  if (!LOG_FILE_ENABLED) return
  try {
    resolvedLogDir = resolveLogDir()
    if (!existsSync(resolvedLogDir)) {
      mkdirSync(resolvedLogDir, { recursive: true })
    }
    todayStr = getLocalDateStr()
    cleanupOldLogs(resolvedLogDir)
  } catch (err) {
    resolvedLogDir = ''
    // 仅首次失败时打印警告，不阻塞应用启动
    console.error(
      `[LOGGER] 文件日志初始化失败，将仅使用控制台输出: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

const getLogFilePath = (): string => {
  if (!resolvedLogDir) return ''
  return join(resolvedLogDir, `starnav-${todayStr}.log`)
}

// 惰性打开当日文件句柄；日期变化时关闭旧句柄并打开新文件
const ensureLogFd = (): number | null => {
  if (!LOG_FILE_ENABLED || !resolvedLogDir) return null
  const now = getLocalDateStr()
  if (logFd !== null && now === todayStr) return logFd

  if (logFd !== null) {
    try {
      closeSync(logFd)
    } catch {
      // 忽略关闭失败
    }
    logFd = null
  }
  todayStr = now
  try {
    logFd = openSync(getLogFilePath(), 'a')
    // 跨天轮转时顺带清理过期日志（进程启动时已清理一次）
    cleanupOldLogs(resolvedLogDir)
  } catch (err) {
    console.warn(
      `[LOGGER] 文件日志打开失败，将仅使用控制台输出: ${err instanceof Error ? err.message : String(err)}`
    )
  }
  return logFd
}

const formatLogEntry = (level: string, msg: string, data: unknown): string => {
  const timestamp = new Date().toISOString()
  const dataStr =
    data && typeof data === 'object' && Object.keys(data).length > 0
      ? ` ${JSON.stringify(data)}`
      : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${msg}${dataStr}\n`
}

const appendToFile = (entry: string) => {
  const fd = ensureLogFd()
  if (fd === null) return
  try {
    writeSync(fd, entry, null, 'utf8')
  } catch (err) {
    // 写入失败时关闭句柄并降级，避免日志系统自身成为盲区
    try {
      closeSync(fd)
    } catch {
      // 忽略关闭失败
    }
    logFd = null
    console.warn(`[LOGGER] 文件日志写入失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// 同步初始化，确保模块加载时日志路径就绪
initLogFileSync()

export interface BackendLogger {
  debug: (msg: string, data?: unknown) => void
  info: (msg: string, data?: unknown) => void
  warn: (msg: string, data?: unknown) => void
  error: (msg: string, err?: unknown) => void
}

/**
 * 统一日志工具 (Logger)
 * 支持多级别日志输出，受环境变量 LOG_LEVEL 控制
 * 同时输出到 console 和文件（设置 LOG_FILE=false 关闭文件日志）
 * 文件日志按日期轮转（默认保留 30 天，LOG_RETENTION_DAYS 可调），
 * 默认存储在 data/logs/starnav-YYYY-MM-DD.log
 */
export const logger: BackendLogger = {
  debug: (msg, data = {}) => {
    if (LOG_LEVEL >= 4) {
      const entry = formatLogEntry('DEBUG', msg, data)
      console.debug(entry.trimEnd())
      appendToFile(entry)
    }
  },
  info: (msg, data = {}) => {
    if (LOG_LEVEL >= 3) {
      const entry = formatLogEntry('INFO', msg, data)
      console.log(entry.trimEnd())
      appendToFile(entry)
    }
  },
  warn: (msg, data = {}) => {
    if (LOG_LEVEL >= 2) {
      const entry = formatLogEntry('WARN', msg, data)
      console.warn(entry.trimEnd())
      appendToFile(entry)
    }
  },
  error: (msg, err = {}) => {
    if (LOG_LEVEL >= 1) {
      const entry = formatLogEntry('ERROR', msg, err)
      console.error(entry.trimEnd())
      appendToFile(entry)
    }
  }
}
