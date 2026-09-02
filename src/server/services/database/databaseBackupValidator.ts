import fs from 'fs'
import Database from 'better-sqlite3'

/**
 * 恢复前校验备份文件是否为合法、可用的 SQLite 数据库。
 *
 * 覆盖真实数据库之前做完整性探测，避免把损坏/非 DB 文件恢复到主库路径造成不可用
 * （第 15 轮审查：restoreDatabase 覆盖前无校验）。
 * 校验项：
 * 1. 只读打开（fileMustExist）——非 SQLite 文件或不存在文件在打开/首次读取时抛错；
 * 2. PRAGMA integrity_check —— 截断/损坏文件返回非 'ok'；
 * 3. sqlite_master 非空 —— 0 字节文件会被 SQLite 当作"空数据库"通过 integrity_check，
 *    但没有数据表，恢复后会丢失全部数据，故一并拒绝。
 *
 * @throws 备份不是合法 SQLite 数据库时抛错，由调用方转换为失败结果。
 */
export const assertRestorableBackup = (backupPath: string) => {
  if (!fs.existsSync(backupPath)) {
    throw new Error('备份文件不存在')
  }

  let probe: Database.Database | null = null
  try {
    probe = new Database(backupPath, { readonly: true, fileMustExist: true })
    const integrity = probe.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') {
      throw new Error(`备份文件完整性检查未通过: ${String(integrity)}`)
    }

    const tableCount =
      (
        probe.prepare('SELECT COUNT(*) AS count FROM sqlite_master').get() as {
          count: number
        }
      )?.count ?? 0
    if (tableCount === 0) {
      throw new Error('备份文件不包含任何数据表，拒绝恢复')
    }
  } finally {
    probe?.close()
  }
}
