import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { fileURLToPath } from 'url'
import path from 'path'
import { cleanupTestDataDir, createTestDataDir } from '../../setup/testDataDir.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../../..')

describe('Stats 统计模型测试 (增量断言版)', () => {
  let Stats
  let testDataDir

  beforeEach(async () => {
    testDataDir = createTestDataDir('starnav-stats-model-test')

    // 动态加载数据库和模型，添加时间戳参数防止 ESM 缓存
    const statsModule = await import(
      path.join(projectRoot, 'src/server/models/stats.js?t=' + Date.now())
    )
    Stats = statsModule.Stats
  })

  afterEach(async () => {
    await cleanupTestDataDir(testDataDir)
  })

  it('初始状态统计', () => {
    const summary = Stats.getSummary()
    expect(summary).toBeDefined()
    expect(summary.distribution).toBeDefined()
  })

  it('应该能成功记录一次访问并增加 PV/UV (相对值判断)', () => {
    const initial = Stats.getSummary()

    Stats.recordVisit({
      ip: '127.0.0.1',
      os: 'Mac OS',
      browser: 'Chrome',
      referrer: 'https://google.com'
    })

    const summary = Stats.getSummary()
    expect(summary.total_pv - initial.total_pv).toBe(1)
    expect(summary.total_uv - initial.total_uv).toBe(1)
    expect(summary.today_pv - initial.today_pv).toBe(1)
    expect(summary.today_uv - initial.today_uv).toBe(1)
  })

  it('同一个 IP 多次访问应仅增加 PV 不增加 UV', () => {
    const initial = Stats.getSummary()

    // 生成随机 IP 避免冲突
    const randomIp = '192.168.100.1'
    Stats.recordVisit({ ip: randomIp })
    Stats.recordVisit({ ip: randomIp })

    const summary = Stats.getSummary()
    expect(summary.total_pv - initial.total_pv).toBe(2)
    expect(summary.total_uv - initial.total_uv).toBe(1)
  })

  it('应该正确统计 OS 和 Browser 分布 (相对值判断)', () => {
    const initial = Stats.getSummary()
    const getCount = (list, name) => list.find((i) => i.name === name)?.value || 0

    Stats.recordVisit({ ip: '10.0.0.1', os: 'Windows-Test', browser: 'Edge-Test' })
    Stats.recordVisit({ ip: '10.0.0.2', os: 'Linux-Test', browser: 'Firefox-Test' })
    Stats.recordVisit({ ip: '10.0.0.3', os: 'Windows-Test', browser: 'Chrome-Test' })

    const summary = Stats.getSummary()

    expect(
      getCount(summary.distribution.os, 'Windows-Test') -
        getCount(initial.distribution.os, 'Windows-Test')
    ).toBe(2)
    expect(
      getCount(summary.distribution.os, 'Linux-Test') -
        getCount(initial.distribution.os, 'Linux-Test')
    ).toBe(1)
    expect(
      getCount(summary.distribution.browser, 'Chrome-Test') -
        getCount(initial.distribution.browser, 'Chrome-Test')
    ).toBe(1)
  })
})
