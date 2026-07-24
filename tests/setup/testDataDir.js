import fs from 'fs'
import os from 'os'
import path from 'path'

export const createTestDataDir = (prefix) => {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`))
  process.env.DATA_PATH = testDataDir
  process.env.NODE_ENV = 'test'
  return testDataDir
}

export const cleanupTestDataDir = async (testDataDir, { closeDatabase = true } = {}) => {
  if (closeDatabase) {
    const { closeDb } = await import('../../src/server/services/database/database.js')
    closeDb()
  }

  if (testDataDir && fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true })
  }

  if (!testDataDir || process.env.DATA_PATH === testDataDir) {
    delete process.env.DATA_PATH
  }
}
