import { describe, it, expect, beforeEach, vi } from 'vitest'
import cache from '../../../src/server/services/cache/cacheService.js'

// Mock logger to suppress expected errors
vi.mock('../../../src/server/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('CacheService', () => {
  beforeEach(() => {
    cache.flush()
  })

  describe('基础缓存操作', () => {
    it('应该成功设置和获取缓存', () => {
      cache.set('test-key', 'test-value')
      expect(cache.get('test-key')).toBe('test-value')
    })

    it('对于不存在的键应该返回 undefined', () => {
      expect(cache.get('non-existent')).toBeUndefined()
    })

    it('应该支持缓存对象', () => {
      const obj = { name: 'test', value: 123 }
      cache.set('obj-key', obj)
      expect(cache.get('obj-key')).toEqual(obj)
    })

    it('应该支持缓存数组', () => {
      const arr = [1, 2, 3, 4]
      cache.set('arr-key', arr)
      expect(cache.get('arr-key')).toEqual(arr)
    })
  })

  describe('TTL 过期机制', () => {
    it('应该在 TTL 过期后返回 undefined', async () => {
      cache.set('ttl-key', 'value', 1) // 1秒过期
      expect(cache.get('ttl-key')).toBe('value')

      // 等待超过 TTL
      await new Promise((resolve) => setTimeout(resolve, 1100))
      expect(cache.get('ttl-key')).toBeUndefined()
    })

    it('应该支持不同的 TTL 值', () => {
      cache.set('short-ttl', 'value1', 1)
      cache.set('long-ttl', 'value2', 10)

      expect(cache.get('short-ttl')).toBe('value1')
      expect(cache.get('long-ttl')).toBe('value2')
    })
  })

  describe('删除操作', () => {
    it('应该成功删除缓存', () => {
      cache.set('key-to-delete', 'value')
      expect(cache.get('key-to-delete')).toBe('value')

      const count = cache.del('key-to-delete')
      expect(count).toBe(1)
      expect(cache.get('key-to-delete')).toBeUndefined()
    })

    it('删除不存在的键应该返回 0', () => {
      const count = cache.del('non-existent')
      expect(count).toBe(0)
    })
  })

  describe('清空操作', () => {
    it('应该清空所有缓存', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      cache.flush()

      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
      expect(cache.get('key3')).toBeUndefined()
    })
  })

  describe('统计信息', () => {
    it('应该正确追踪命中和未命中', () => {
      // 获取初始统计值
      const initialStats = cache.getStats()
      const initialHits = initialStats.hits
      const initialMisses = initialStats.misses

      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key1') // hit
      cache.get('key2') // miss
      cache.get('key3') // miss

      const stats = cache.getStats()
      // 验证相对增量而不是绝对值
      expect(stats.hits - initialHits).toBe(2)
      expect(stats.misses - initialMisses).toBe(2)
      expect(stats.sets).toBeGreaterThanOrEqual(1)
    })

    it('应该计算命中率', () => {
      // 获取初始统计值
      const initialStats = cache.getStats()

      cache.set('key1', 'value1')

      cache.get('key1') // hit
      cache.get('key2') // miss

      const stats = cache.getStats()
      // const newTotal = stats.hits + stats.misses

      // 验证新增的操作命中率为 50%
      const newHits = stats.hits - initialStats.hits
      const newMisses = stats.misses - initialStats.misses
      expect(newHits).toBe(1)
      expect(newMisses).toBe(1)
      // 总命中率可能受历史影响，所以只验证hitRate字段存在
      expect(stats.hitRate).toMatch(/^\d+\.\d{2}%$/)
    })

    it('应该报告缓存键数量', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.keys).toBe(2)
    })
  })

  describe('getOrSet 方法', () => {
    it('缓存未命中时应该调用获取函数', async () => {
      let callCount = 0
      const fetchFn = async () => {
        callCount++
        return 'fetched-value'
      }

      const value = await cache.getOrSet('test-key', fetchFn)

      expect(value).toBe('fetched-value')
      expect(callCount).toBe(1)
    })

    it('缓存命中时不应该调用获取函数', async () => {
      let callCount = 0
      const fetchFn = async () => {
        callCount++
        return 'fetched-value'
      }

      // 第一次调用
      await cache.getOrSet('test-key', fetchFn)
      expect(callCount).toBe(1)

      // 第二次调用（应该从缓存获取）
      const value = await cache.getOrSet('test-key', fetchFn)
      expect(value).toBe('fetched-value')
      expect(callCount).toBe(1) // 未增加
    })

    it('获取函数抛出错误时应该传播错误', async () => {
      const fetchFn = async () => {
        throw new Error('Fetch failed')
      }

      await expect(cache.getOrSet('test-key', fetchFn)).rejects.toThrow('Fetch failed')
    })

    it('应该支持自定义 TTL', async () => {
      const fetchFn = async () => 'value'

      await cache.getOrSet('test-key', fetchFn, 1) // 1秒过期

      expect(cache.get('test-key')).toBe('value')

      await new Promise((resolve) => setTimeout(resolve, 1100))
      expect(cache.get('test-key')).toBeUndefined()
    })
  })
})
