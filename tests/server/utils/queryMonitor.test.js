// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = {
  info: vi.fn(),
  warn: vi.fn()
}

vi.mock('../../../src/server/utils/logger.js', () => ({
  logger
}))

const { QueryMonitor } = await import('../../../src/server/utils/queryMonitor.js')

describe('QueryMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tracks aggregate query stats and returns rounded averages', () => {
    const monitor = new QueryMonitor()
    const nowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(75)

    const query = monitor.monitor((value) => value * 2, 'items.select')

    expect(query(2)).toBe(4)
    expect(query(4)).toBe(8)
    expect(monitor.getStats()).toEqual({
      'items.select': {
        count: 2,
        totalTime: 75,
        avgTime: 37.5,
        maxTime: 50,
        minTime: 25
      }
    })

    nowSpy.mockRestore()
  })

  it('records slow queries, keeps the latest 50, and resets state', () => {
    const monitor = new QueryMonitor()
    const nowValues = []
    for (let index = 0; index < 55; index += 1) {
      nowValues.push(index * 200, index * 200 + 150)
    }
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowValues.shift() ?? 0)

    const slowQuery = monitor.monitor((value) => value, 'items.slow')
    for (let index = 0; index < 55; index += 1) {
      slowQuery(index)
    }

    const slowQueries = monitor.getSlowQueries()
    expect(slowQueries).toHaveLength(10)
    expect(monitor.slowQueries).toHaveLength(50)
    expect(monitor.slowQueries[0].args).toBe('[5]')
    expect(slowQueries[0]).toEqual(
      expect.objectContaining({
        name: 'items.slow',
        duration: 150,
        args: '[54]'
      })
    )
    expect(logger.warn).toHaveBeenCalledTimes(55)

    monitor.reset()

    expect(monitor.getStats()).toEqual({})
    expect(monitor.getSlowQueries(5)).toEqual([])
    expect(logger.info).toHaveBeenCalledWith('查询监控数据已重置')

    nowSpy.mockRestore()
  })
})
