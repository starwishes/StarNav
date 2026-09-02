// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const serverRoot = path.join(process.cwd(), 'src', 'server')

const collectSourceFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectSourceFiles(target)
    }

    return entry.isFile() && (target.endsWith('.js') || target.endsWith('.ts')) ? [target] : []
  })

describe('bookmark facade boundary', () => {
  it('does not keep BookmarkManager or CategoryManager compatibility facades', () => {
    const managerPaths = [
      path.join(serverRoot, 'services/bookmark/BookmarkManager.js'),
      path.join(serverRoot, 'services/bookmark/BookmarkManager.ts'),
      path.join(serverRoot, 'services/bookmark/CategoryManager.js'),
      path.join(serverRoot, 'services/bookmark/CategoryManager.ts')
    ]

    for (const managerPath of managerPaths) {
      expect(fs.existsSync(managerPath)).toBe(false)
    }

    const violations = collectSourceFiles(serverRoot)
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf-8')
        return (
          source.includes('BookmarkManager.js') ||
          source.includes('CategoryManager.js') ||
          source.includes('new BookmarkManager(') ||
          source.includes('new CategoryManager(')
        )
      })
      .map((file) => path.relative(serverRoot, file))

    expect(violations).toEqual([])
  })
})
