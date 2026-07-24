import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FALLBACK_APP_VERSION = '0.0.0'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../../../package.json')

export const readAppVersion = (): string => {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    return FALLBACK_APP_VERSION
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8')) as { version?: unknown }
    return typeof pkg.version === 'string' && pkg.version ? pkg.version : FALLBACK_APP_VERSION
  } catch {
    return FALLBACK_APP_VERSION
  }
}

export const APP_VERSION = readAppVersion()
