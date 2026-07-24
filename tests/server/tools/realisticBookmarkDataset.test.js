import { describe, expect, it } from 'vitest'

import {
  buildRealisticBookmarkDataset,
  buildRealisticJsonBackupPayload
} from '../../../src/server/tools/realisticBookmarkDataset.js'

describe('realisticBookmarkDataset', () => {
  it('builds 10 categories and 100 unique bookmark records', () => {
    const dataset = buildRealisticBookmarkDataset()

    expect(dataset.categories).toHaveLength(10)
    expect(dataset.items).toHaveLength(100)
    expect(new Set(dataset.categories.map((category) => category.id)).size).toBe(10)
    expect(new Set(dataset.items.map((item) => item.id)).size).toBe(100)
    expect(new Set(dataset.items.map((item) => item.url)).size).toBe(100)
    expect(dataset.items[0]).toMatchObject({
      name: 'GitHub',
      url: 'https://github.com',
      icon: 'https://github.com/favicon.ico',
      categoryId: 1,
      pinned: true
    })
    expect(dataset.items[99]).toMatchObject({
      name: 'Speedtest',
      url: 'https://www.speedtest.net',
      categoryId: 10
    })
    expect(dataset.categories.map((category) => category.icon)).toEqual([
      'icon-md-code',
      'icon-a-smartrobot-fill',
      'icon-md-planet',
      'icon-bianji',
      'icon-wenzi',
      'icon-md-photos',
      'icon-md-clipboard',
      'icon-interactive-fill',
      'icon-tag',
      'icon-xuexi'
    ])
  })

  it('builds a json backup payload around the realistic dataset', () => {
    const payload = buildRealisticJsonBackupPayload()

    expect(payload.meta).toMatchObject({
      schemaVersion: 1,
      categoryCount: 10,
      itemCount: 100
    })
    expect(payload.content.categories).toHaveLength(10)
    expect(payload.content.items).toHaveLength(100)
  })
})
