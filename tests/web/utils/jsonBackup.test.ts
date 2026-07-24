import { describe, expect, it, vi } from 'vitest'

import { buildJsonBackupPayload, parseJsonBackupPayload } from '../../../src/web/utils/jsonBackup'

describe('jsonBackup utils', () => {
  it('builds a metadata-rich backup payload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12T11:22:33.000Z'))

    const payload = buildJsonBackupPayload({
      categories: [{ id: 1, name: 'Docs' }],
      items: [
        { id: 1, name: 'StarNav', url: 'https://example.com', description: '', categoryId: 1 }
      ]
    })

    expect(payload).toEqual({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-12T11:22:33.000Z',
        categoryCount: 1,
        itemCount: 1
      },
      content: {
        categories: [{ id: 1, name: 'Docs' }],
        items: [
          { id: 1, name: 'StarNav', url: 'https://example.com', description: '', categoryId: 1 }
        ]
      }
    })

    vi.useRealTimers()
  })

  it('parses the new backup envelope format', () => {
    const parsed = parseJsonBackupPayload({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-12T11:22:33.000Z',
        categoryCount: 1,
        itemCount: 1
      },
      content: {
        categories: [{ id: 1, name: 'Docs' }],
        items: [{ id: 2, name: 'Link', url: 'https://example.com', description: '', categoryId: 1 }]
      }
    })

    expect(parsed).toEqual({
      meta: {
        schemaVersion: 1,
        exportedAt: '2026-04-12T11:22:33.000Z',
        categoryCount: 1,
        itemCount: 1
      },
      content: {
        categories: [{ id: 1, name: 'Docs' }],
        items: [{ id: 2, name: 'Link', url: 'https://example.com', description: '', categoryId: 1 }]
      }
    })
  })

  it('keeps legacy raw backup content compatible', () => {
    const parsed = parseJsonBackupPayload({
      categories: [{ id: 1, name: 'Docs' }],
      items: [{ id: 2, name: 'Link', url: 'https://example.com', description: '', categoryId: 1 }]
    })

    expect(parsed).toEqual({
      meta: null,
      content: {
        categories: [{ id: 1, name: 'Docs' }],
        items: [{ id: 2, name: 'Link', url: 'https://example.com', description: '', categoryId: 1 }]
      }
    })
  })

  it('rejects invalid backup payloads', () => {
    expect(parseJsonBackupPayload({ hello: 'world' })).toBeNull()
  })
})
