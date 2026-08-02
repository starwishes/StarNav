import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCategoryTree,
  flattenCategoryTree,
  readFileAsDataUrl
} from '@/components/SiteDialog/form-utils'

describe('SiteDialog form utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('builds and flattens nested category trees with depth markers', () => {
    const tree = buildCategoryTree([
      { id: 1, name: 'Docs', parentId: null },
      { id: 2, name: 'API', parentId: 1 },
      { id: 3, name: 'Custom', parentId: null }
    ])

    expect(flattenCategoryTree(tree)).toEqual([
      { value: '1', label: 'Docs' },
      { value: '2', label: '> API' },
      { value: '3', label: 'Custom' }
    ])
  })

  it('reads files through FileReader and rejects when reading fails', async () => {
    class SuccessfulReader {
      result = 'data:text/plain;base64,Zm9v'
      error = null
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL() {
        this.onload?.()
      }
    }

    vi.stubGlobal('FileReader', SuccessfulReader as any)
    await expect(readFileAsDataUrl(new File(['foo'], 'foo.txt'))).resolves.toBe(
      'data:text/plain;base64,Zm9v'
    )

    class FailedReader {
      result = null
      error = new Error('read failed')
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL() {
        this.onerror?.()
      }
    }

    vi.stubGlobal('FileReader', FailedReader as any)
    await expect(readFileAsDataUrl(new File(['bar'], 'bar.txt'))).rejects.toThrow('read failed')
    vi.unstubAllGlobals()
  })
})
