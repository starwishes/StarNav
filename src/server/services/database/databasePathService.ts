import fs from 'fs'
import os from 'os'
import path from 'path'

import { DATA_DIR } from '../../config/index.js'

const TEST_RUN_INSTANCE_ID = process.env.VITEST_RUN_ID || String(process.pid)
const DEFAULT_TEST_DATA_DIR = path.join(os.tmpdir(), 'starnav-vitest')

export const databasePathService = {
  getDbPath() {
    if (process.env.NODE_ENV === 'test') {
      const workerId = process.env.VITEST_WORKER_ID || 'single'
      const testDataDir = process.env.DATA_PATH || DEFAULT_TEST_DATA_DIR
      fs.mkdirSync(testDataDir, { recursive: true })
      return path.join(testDataDir, `starnav-test-${TEST_RUN_INSTANCE_ID}-${workerId}.db`)
    }

    return path.join(DATA_DIR, 'starnav.db')
  }
}
