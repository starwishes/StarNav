// @vitest-environment node
import fs from 'fs'
import { describe, expect, it, vi } from 'vitest'

import { databaseStatsService } from '../../../src/server/services/database/databaseStatsService.js'

describe('DatabaseStatsService', () => {
  it('should collect category, item and user counts from the current database', () => {
    const values = [3, 9, 2, 4]
    vi.spyOn(fs, 'statSync').mockReturnValue({ size: 128 })
    vi.spyOn(fs, 'accessSync').mockImplementation(() => {})

    const db = {
      pragma: vi.fn((statement) => {
        if (statement === 'journal_mode') {
          return 'wal'
        }

        if (statement === 'quick_check') {
          return 'ok'
        }

        return 'unknown'
      }),
      prepare: vi.fn(() => ({
        get: () => ({ count: values.shift() })
      }))
    }

    const result = databaseStatsService.getDbStats(db, '/tmp/starnav.db')

    expect(result).toEqual({
      ok: true,
      size: 128,
      tables: 4,
      categoryCount: 3,
      itemCount: 9,
      userCount: 2,
      dbPath: '/tmp/starnav.db',
      fileExists: true,
      writable: true,
      journalMode: 'wal',
      quickCheck: 'ok'
    })
  })
})
