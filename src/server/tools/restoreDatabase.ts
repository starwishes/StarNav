import path from 'path'

import { DATA_DIR } from '../config/index.js'
import { closeDb } from '../services/database/database.js'
import { databaseMaintenanceService } from '../services/database/databaseMaintenanceService.js'
import { databasePathService } from '../services/database/databasePathService.js'

const formatTimestamp = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-')

const printUsageAndExit = () => {
  console.error('用法: npm run db:restore -- --from /path/to/starnav.db.bak')
  process.exit(1)
}

const readArgValue = (flag: string) => {
  const flagIndex = process.argv.indexOf(flag)
  if (flagIndex === -1) {
    return null
  }

  return process.argv[flagIndex + 1] || null
}

const backupPathInput = readArgValue('--from') || process.env.BACKUP_PATH

if (!backupPathInput) {
  printUsageAndExit()
}

const resolvedBackupInput = backupPathInput as string
const dbPath = databasePathService.getDbPath()
const backupPath = path.resolve(resolvedBackupInput)

if (backupPath === path.resolve(dbPath)) {
  console.error('恢复源文件不能与当前数据库路径相同。')
  process.exit(1)
}

const snapshotPath = path.join(
  DATA_DIR,
  'backups',
  `starnav-pre-restore-${formatTimestamp()}.db.bak`
)

closeDb()

const result = databaseMaintenanceService.restoreDatabase({
  dbPath,
  backupPath,
  snapshotPath
})

if (!result.success) {
  console.error(`数据库恢复失败: ${result.error}`)
  process.exit(1)
}

console.log(`已恢复数据库: ${result.path}`)
if (result.previousBackupPath) {
  console.log(`恢复前快照: ${result.previousBackupPath}`)
}
