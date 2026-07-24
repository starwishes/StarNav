/* global console, process */
/**
 * Regenerate OpenAPI client types and fail if the committed artifact drifts.
 *
 * Usage:
 *   node scripts/openapi/check-openapi-types.mjs
 *   npm run openapi:types:check
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { generateOpenApiTypes } from './generate-openapi-types.mjs'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')
const GENERATED_REL = path.join('src', 'shared', 'types', 'openapi.generated.ts')
const GENERATED_PATH = path.join(REPO_ROOT, GENERATED_REL)

const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n')

const readIfExists = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export const checkOpenApiTypes = async ({
  repoRoot = REPO_ROOT,
  regenerateSpec = true
} = {}) => {
  const generatedPath = path.join(repoRoot, GENERATED_REL)
  const before = await readIfExists(generatedPath)

  await generateOpenApiTypes({
    outputPath: generatedPath,
    regenerateSpec
  })

  const after = await fs.readFile(generatedPath, 'utf8')

  if (before === null) {
    return {
      ok: false,
      reason: 'missing',
      path: path.relative(repoRoot, generatedPath)
    }
  }

  if (normalizeNewlines(before) !== normalizeNewlines(after)) {
    // Best-effort restore of committed content so a failed check does not leave dirty tree
    // when the caller only wanted a gate. Callers that want regeneration should run openapi:types.
    await fs.writeFile(generatedPath, before, 'utf8')
    return {
      ok: false,
      reason: 'drift',
      path: path.relative(repoRoot, generatedPath)
    }
  }

  // If tracked, fail when git still reports a content modification after regenerate
  // (e.g. line-ending / mode edge cases). Untracked (??) is OK for first-time add.
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--', GENERATED_REL],
      { cwd: repoRoot }
    )
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
    const modified = lines.filter((line) => !line.startsWith('??'))
    if (modified.length > 0) {
      return {
        ok: false,
        reason: 'git-dirty',
        path: GENERATED_REL,
        detail: modified.join('\n')
      }
    }
  } catch {
    // Not a git worktree or git unavailable — content equality is enough
  }

  return {
    ok: true,
    path: path.relative(repoRoot, generatedPath)
  }
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  const result = await checkOpenApiTypes()
  if (!result.ok) {
    console.error(`[openapi:types:check] FAIL (${result.reason}): ${result.path}`)
    if (result.detail) {
      console.error(result.detail)
    }
    console.error('Run: npm run openapi:types  then commit common/types/openapi.generated.ts')
    process.exit(1)
  }
  console.log(`[openapi:types:check] OK ${result.path}`)
}
