// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  buildRealisticBookmarkDataset,
  buildRealisticJsonBackupPayload
} from '../../../src/server/tools/realisticBookmarkDataset.js'

describe('realisticBookmarkDataset', () => {
  it('builds a dataset with categories and items matching the requested count', () => {
    const dataset = buildRealisticBookmarkDataset(30)
    expect(dataset.categories.length).toBeGreaterThan(0)
    expect(dataset.items.length).toBe(30)
    expect(dataset.items[0]).toMatchObject({
      name: expect.any(String),
      url: expect.stringMatching(/^https?:\/\//)
    })
  })

  it('defaults the item count to the full site definition list', () => {
    const full = buildRealisticBookmarkDataset()
    const limited = buildRealisticBookmarkDataset(5)
    expect(full.items.length).toBeGreaterThan(limited.items.length)
  })

  it('builds a json backup payload with schema metadata', () => {
    const payload = buildRealisticJsonBackupPayload(12)
    expect(payload.meta.schemaVersion).toBe(1)
    expect(payload.meta.itemCount).toBe(12)
    expect(payload.meta.categoryCount).toBe(payload.content.categories.length)
    expect(payload.content.items).toHaveLength(12)
    expect(payload.meta.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('cycles through site definitions with expanded variants and query seeds', () => {
    const dataset = buildRealisticBookmarkDataset(1000)
    const expanded = dataset.items.find((item) => item.name.includes('#'))
    const seeded = dataset.items.find((item) => item.url.includes('navSeed='))

    expect(dataset.items[0].name).toMatch(/^\S+/)
    expect(expanded).toBeDefined()
    expect(seeded).toBeDefined()
    expect(seeded.url).toMatch(/[?&]navSeed=\d+/)
  })

  it('marks every tenth item as pinned and fills visit metadata', () => {
    const dataset = buildRealisticBookmarkDataset(100)
    expect(dataset.items[0].pinned).toBe(true)
    expect(dataset.items[5].pinned).toBe(false)
    expect(dataset.items[0].icon).toMatch(/favicon\.ico$/)
    expect(dataset.items[0].lastVisited).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(dataset.items[0].clickCount).toBeGreaterThan(dataset.items[1].clickCount)
  })

  it('falls back to the default count for zero and clamps negatives to one', () => {
    const defaultCount = buildRealisticBookmarkDataset().items.length
    expect(buildRealisticBookmarkDataset(0).items).toHaveLength(defaultCount)
    expect(buildRealisticBookmarkDataset(-3).items).toHaveLength(1)
  })

  it('generates json to stdout when invoked as the CLI entry point', async () => {
    const originalArgv = process.argv
    const originalWrite = process.stdout.write
    process.argv = [process.execPath, 'realisticBookmarkDataset.ts', '5']
    const chunks = []
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk))
      return true
    })

    vi.resetModules()
    await import('../../../src/server/tools/realisticBookmarkDataset.js?cli=' + Date.now())

    process.argv = originalArgv
    process.stdout.write = originalWrite

    const output = chunks.join('')
    expect(output).toContain('"schemaVersion": 1')
    expect(output).toContain('"itemCount": 5')
  })
})
