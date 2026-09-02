// @vitest-environment node
/**
 * Authentication and Data Service Tests
 * Testing data persistence and category relationships
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../..')

// Import services using dynamic import to handle ESM

describe('Authentication and Data Service', () => {
  let bookmarkMutationService
  let bookmarkSnapshotService
  let testDataDir

  beforeEach(async () => {
    testDataDir = createTestDataDir('starnav-auth-api-test')

    // 重置写前备份节流，避免测试间 500ms force 窗口导致 saveData 中止
    const { resetBackupThrottle } = await import(
      path.join(projectRoot, 'src/server/services/database/backupThrottle.js')
    )
    resetBackupThrottle()

    // Dynamically import services
    const cacheBust = Date.now()
    const [mutationModule, snapshotModule] = await Promise.all([
      import(
        path.join(
          projectRoot,
          `src/server/services/bookmark/bookmarkMutationService.js?t=${cacheBust}`
        )
      ),
      import(
        path.join(
          projectRoot,
          `src/server/services/bookmark/bookmarkSnapshotService.js?t=${cacheBust}`
        )
      )
    ])
    bookmarkMutationService = mutationModule.bookmarkMutationService
    bookmarkSnapshotService = snapshotModule.bookmarkSnapshotService
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  it('should save and retrieve user data', () => {
    const testData = {
      categories: [{ id: 1, name: 'Test Category', parentId: null, level: 0 }],
      items: [{ id: 1, name: 'Test Item', url: 'https://example.com', categoryId: 1, level: 0 }]
    }

    bookmarkMutationService.saveData(testData)

    const loaded = bookmarkSnapshotService.getData(0) // Get all data for level 0 (guest)
    expect(loaded.categories).toBeDefined()
    expect(loaded.categories).toBeInstanceOf(Array)
    expect(loaded.items).toBeDefined()
    expect(loaded.items).toBeInstanceOf(Array)
  })

  it('should handle parent-child category relationships', () => {
    const testData = {
      categories: [
        { id: 1, name: 'Parent', parentId: null, level: 0 },
        { id: 2, name: 'Child', parentId: 1, level: 0 }
      ],
      items: []
    }

    bookmarkMutationService.saveData(testData)
    const loaded = bookmarkSnapshotService.getData(0)

    expect(loaded.categories).toBeDefined()
    expect(loaded.categories.length).toBeGreaterThan(0)

    // Check if parent-child relationship is maintained
    const categories = loaded.categories
    const hasParentChild = categories.some((c) => c.parentId !== null && c.parentId !== undefined)
    expect(hasParentChild).toBe(true)
  })
})
