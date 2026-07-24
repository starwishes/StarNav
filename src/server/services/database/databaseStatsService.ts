import fs from 'fs'
import type { getDb } from './database.js'
import type { CountRow } from '../../types/sqliteRows.js'

type SqliteDb = ReturnType<typeof getDb>

const hasAccess = (targetPath: string | null | undefined, mode: number) => {
  if (!targetPath) {
    return false
  }

  try {
    fs.accessSync(targetPath, mode)
    return true
  } catch {
    return false
  }
}

const readPragmaValue = (db: SqliteDb, statement: string) => {
  if (typeof db?.pragma !== 'function') {
    return 'unknown'
  }

  try {
    const value = db.pragma(statement, { simple: true })
    return value ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export const databaseStatsService = {
  getDbStats(db: SqliteDb, dbPath?: string | null) {
    const categoryCount =
      db.prepare<CountRow>('SELECT COUNT(*) as count FROM categories').get()?.count ?? 0
    const itemCount = db.prepare<CountRow>('SELECT COUNT(*) as count FROM items').get()?.count ?? 0
    const userCount = db.prepare<CountRow>('SELECT COUNT(*) as count FROM users').get()?.count ?? 0
    const tables =
      db
        .prepare<CountRow>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        )
        .get()?.count ?? 0

    let size = 0
    let fileExists = false
    let writable = false
    if (dbPath) {
      try {
        size = fs.statSync(dbPath).size
        fileExists = true
      } catch {
        size = 0
      }

      writable = hasAccess(dbPath, fs.constants.W_OK)
    }

    const journalMode = String(readPragmaValue(db, 'journal_mode')).toLowerCase()
    const quickCheck = String(readPragmaValue(db, 'quick_check'))
    const ok = quickCheck === 'unknown' || quickCheck.toLowerCase() === 'ok'

    return {
      ok,
      size,
      tables,
      categoryCount,
      itemCount,
      userCount,
      dbPath,
      fileExists,
      writable,
      journalMode,
      quickCheck
    }
  }
}
