import { invalidateCache } from '../../../src/server/services/bookmark/cache.js'
import { getDb } from '../../../src/server/services/database/database.js'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

let urlSequence = 0

export const createUniqueUrl = (label = 'bookmark') =>
  `https://${label}-${process.pid}-${Date.now()}-${urlSequence++}.test`

export const resetBookmarkTables = (db = getDb()) => {
  db.exec('DELETE FROM items')
  db.exec('DELETE FROM categories')
}

export const createBookmarkTestContext = (prefix = 'starnav-bookmark-service') => {
  const testDataDir = createTestDataDir(prefix)
  const db = getDb()
  resetBookmarkTables(db)
  invalidateCache()
  return {
    db,
    testDataDir
  }
}

export const cleanupBookmarkTestContext = async (testDataDir) => {
  invalidateCache()
  await cleanupTestDataDir(testDataDir)
}
