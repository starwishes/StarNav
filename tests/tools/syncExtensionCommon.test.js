import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

describe('sync-extension-common CLI', () => {
  it('passes the drift check when the extension common files are in sync', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['scripts/extension/sync-extension-common.mjs', '--check'],
      { cwd: repoRoot }
    )

    expect(stdout).toContain('in sync')
  })

  it('reports updated or unchanged modules when run without --check', async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ['scripts/extension/sync-extension-common.mjs'],
      { cwd: repoRoot }
    )

    expect(stdout).toMatch(
      /\[extension:sync-common\] (updated|unchanged) clients\/extension\/common\/(api|logger)\.js/
    )
  })
})
