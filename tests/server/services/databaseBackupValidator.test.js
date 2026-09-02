// @vitest-environment node
import fs from 'fs'
import os from 'os'
import path from 'path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'

import { assertRestorableBackup } from '../../../src/server/services/database/databaseBackupValidator.js'

describe('assertRestorableBackup', () => {
  let testDir

  afterEach(() => {
    if (testDir) {
      fs.rmSync(testDir, { recursive: true, force: true })
      testDir = undefined
    }
  })

  const makeTempDir = () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starnav-backup-validator-'))
    return testDir
  }

  it('accepts a valid SQLite backup file', () => {
    const dir = makeTempDir()
    const dbPath = path.join(dir, 'sample.db')
    const db = new Database(dbPath)
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)')
    db.prepare('INSERT INTO items (name) VALUES (?)').run('hello')
    db.close()

    expect(() => assertRestorableBackup(dbPath)).not.toThrow()
  })

  it('rejects a truncated / non-database backup file', () => {
    const dir = makeTempDir()
    const junkPath = path.join(dir, 'junk.bak')
    fs.writeFileSync(junkPath, 'this is not a sqlite database at all')

    expect(() => assertRestorableBackup(junkPath)).toThrow()
  })

  it('rejects an empty file even though sqlite treats it as a blank database', () => {
    const dir = makeTempDir()
    const emptyPath = path.join(dir, 'empty.bak')
    fs.writeFileSync(emptyPath, '')

    // 0 字节文件：readonly 打开时 SQLite 可能直接抛错，或通过打开但无任何数据表——
    // 两种路径都必须被拒（不能把空库恢复到主库路径）。
    expect(() => assertRestorableBackup(emptyPath)).toThrow()
  })

  it('rejects a missing backup file', () => {
    const dir = makeTempDir()
    expect(() => assertRestorableBackup(path.join(dir, 'nope.bak'))).toThrow('备份文件不存在')
  })
})
