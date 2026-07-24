const FALLBACK_CONSOLE = {
  debug() {
  },
  info() {
  },
  warn() {
  },
  error() {
  }
};
const resolveConsole = () => {
  if (typeof globalThis !== "undefined" && globalThis.console) {
    return globalThis.console;
  }
  return FALLBACK_CONSOLE;
};
const formatPrefix = (scope) => {
  if (!scope) {
    return "[StarNav]";
  }
  return `[StarNav:${scope}]`;
};
const createScopedLogger = (scope = "") => {
  const prefix = formatPrefix(scope);
  const write = (method, message, ...meta) => {
    const consoleRef = resolveConsole();
    const sink = typeof consoleRef[method] === "function" ? consoleRef[method] : consoleRef.info;
    sink(`${prefix} ${message}`, ...meta);
  };
  return {
    debug: (message, ...meta) => write("debug", message, ...meta),
    info: (message, ...meta) => write("info", message, ...meta),
    warn: (message, ...meta) => write("warn", message, ...meta),
    error: (message, ...meta) => write("error", message, ...meta)
  };
};
export {
  createScopedLogger
};
