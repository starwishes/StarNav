import { describe, expect, it } from 'vitest'

import { normalizeData, normalizeId, normalizeUrl } from '../../../src/server/utils/normalize.js'

describe('normalize utils', () => {
  it('normalizes ids and shared urls with existing backend rules', () => {
    expect(normalizeId('42')).toBe(42)
    expect(normalizeId('bad')).toBe(0)

    expect(normalizeUrl(' Example.com/path/?utm_source=test#')).toBe('https://example.com/path')
    expect(normalizeUrl('ftp://example.com')).toBe('')
    expect(normalizeUrl('mailto:test@example.com')).toBe('')
  })

  it('recursively normalizes bookmark payloads and migrates private flags to levels', () => {
    expect(
      normalizeData({
        id: '7',
        categoryId: '8',
        url: 'Example.com/docs/?utm_source=test',
        private: true,
        nested: {
          id: '9',
          categoryId: '10',
          url: 'https://Nested.EXAMPLE.com/path//',
          private: true
        }
      })
    ).toEqual({
      id: 7,
      categoryId: 8,
      url: 'https://example.com/docs',
      level: 1,
      nested: {
        id: 9,
        categoryId: 10,
        url: 'https://nested.example.com/path',
        level: 1
      }
    })
  })

  it('filters invalid urls from arrays and preserves non-object primitive values', () => {
    expect(
      normalizeData([
        { id: '1', url: 'https://valid.test', categoryId: '2' },
        { id: '2', url: 'mailto:test@example.com', categoryId: '2' },
        'plain'
      ])
    ).toEqual([{ id: 1, url: 'https://valid.test/', categoryId: 2 }, 'plain'])

    expect(normalizeData(null)).toBeNull()
    expect(normalizeData(12)).toBe(12)
  })
})
