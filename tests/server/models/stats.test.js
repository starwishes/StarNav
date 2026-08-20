import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { fileURLToPath } from 'url'
import path from 'path'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'
import { getDb } from '../../../src/server/services/database/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../..')

const today = () => new Date().toISOString().split('T')[0]

describe('Stats 统计模型测试 (增量断言版)', () => {
  let Stats
  let testDataDir

  beforeEach(async () => {
    testDataDir = createTestDataDir('starnav-stats-model-test')

    // 动态加载模型，添加时间戳参数防止 ESM 缓存
    const statsModule = await import(
      path.join(projectRoot, 'src/server/models/stats.js?t=' + Date.now())
    )
    Stats = statsModule.Stats
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  it('应该能成功记录一次访问并增加 PV/UV (相对值判断)', () => {
    const db = getDb()
    const before = db.prepare('SELECT pv, uv FROM daily_stats WHERE date = ?').get(today()) || {
      pv: 0,
      uv: 0
    }

    Stats.recordVisit({
      ip: '127.0.0.1',
      os: 'Mac OS',
      browser: 'Chrome',
      referrer: 'https://google.com'
    })

    const after = db.prepare('SELECT pv, uv FROM daily_stats WHERE date = ?').get(today()) || {
      pv: 0,
      uv: 0
    }
    expect(after.pv - before.pv).toBe(1)
    expect(after.uv - before.uv).toBe(1)

    const log = db.prepare('SELECT * FROM visit_logs WHERE ip = ?').get('127.0.0.1')
    expect(log.os).toBe('Mac OS')
    expect(log.browser).toBe('Chrome')
  })

  it('同一个 IP 多次访问应仅增加 PV 不增加 UV', () => {
    const db = getDb()
    const before = db.prepare('SELECT pv, uv FROM daily_stats WHERE date = ?').get(today()) || {
      pv: 0,
      uv: 0
    }

    const randomIp = '192.168.100.1'
    Stats.recordVisit({ ip: randomIp })
    Stats.recordVisit({ ip: randomIp })

    const after = db.prepare('SELECT pv, uv FROM daily_stats WHERE date = ?').get(today()) || {
      pv: 0,
      uv: 0
    }
    expect(after.pv - before.pv).toBe(2)
    expect(after.uv - before.uv).toBe(1)

    // 同一 IP 只记录一条访问日志 (UNIQUE 去重)
    const logCount = db
      .prepare('SELECT COUNT(*) as count FROM visit_logs WHERE ip = ?')
      .get(randomIp).count
    expect(logCount).toBe(1)
  })
})
