import path from 'path'

import { DATA_DIR } from '../config/index.js'
import { forceCheckpoint, getDb, closeDb } from '../services/database/database.js'
import { databaseMaintenanceService } from '../services/database/databaseMaintenanceService.js'
import { databasePathService } from '../services/database/databasePathService.js'

const formatTimestamp = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-')

const readArgValue = (flag: string) => {
  const flagIndex = process.argv.indexOf(flag)
  if (flagIndex === -1) {
    return null
  }

  return process.argv[flagIndex + 1] || null
}

const resolveOutputPath = () => {
  const explicitOutput = readArgValue('--output') || process.env.BACKUP_OUTPUT_PATH
  if (explicitOutput) {
    return path.resolve(explicitOutput)
  }

  return path.join(DATA_DIR, 'backups', `starnav-${formatTimestamp()}.db.bak`)
}

try {
  const db = getDb()

  const dbPath = databasePathService.getDbPath()
  const outputPath = resolveOutputPath()
  const result = databaseMaintenanceService.backupDatabase({
    db,
    dbPath,
    checkpoint: forceCheckpoint,
    outputPath
  })

  if (!result.success) {
    console.error(`数据库备份失败: ${result.error}`)
    process.exit(1)
  }

  console.log(`数据库路径: ${dbPath}`)
  console.log(`备份文件: ${result.path}`)
} finally {
  closeDb()
}
