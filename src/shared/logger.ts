export interface ScopedLogger {
  debug(message: string, ...meta: unknown[]): void
  info(message: string, ...meta: unknown[]): void
  warn(message: string, ...meta: unknown[]): void
  error(message: string, ...meta: unknown[]): void
}

type ConsoleMethod = 'debug' | 'info' | 'warn' | 'error'

const FALLBACK_CONSOLE: Record<ConsoleMethod, (...args: unknown[]) => void> = {
  debug() {},
  info() {},
  warn() {},
  error() {}
}

const resolveConsole = () => {
  if (typeof globalThis !== 'undefined' && globalThis.console) {
    return globalThis.console
  }

  return FALLBACK_CONSOLE
}

const formatPrefix = (scope: string) => {
  if (!scope) {
    return '[StarNav]'
  }

  return `[StarNav:${scope}]`
}

export const createScopedLogger = (scope = ''): ScopedLogger => {
  const prefix = formatPrefix(scope)

  const write = (method: ConsoleMethod, message: string, ...meta: unknown[]) => {
    const consoleRef = resolveConsole() as Record<string, (...args: unknown[]) => void>
    const sink =
      typeof consoleRef[method] === 'function' ? consoleRef[method] : consoleRef.info
    sink(`${prefix} ${message}`, ...meta)
  }

  return {
    debug: (message, ...meta) => write('debug', message, ...meta),
    info: (message, ...meta) => write('info', message, ...meta),
    warn: (message, ...meta) => write('warn', message, ...meta),
    error: (message, ...meta) => write('error', message, ...meta)
  }
}
