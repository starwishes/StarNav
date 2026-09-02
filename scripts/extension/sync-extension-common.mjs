/**
 * Sync src/shared/*.ts modules used by the browser extension into
 * clients/extension/common/*.js (type-stripped ESM via esbuild).
 *
 * Source of truth: repository src/shared/
 * Consumers: clients/extension packaging (copies extension tree only)
 *
 * Usage:
 *   node scripts/extension/sync-extension-common.mjs
 *   node scripts/extension/sync-extension-common.mjs --check
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')

/** Shared modules mirrored into clients/extension/common */
const SYNC_MODULES = ['api', 'logger', 'url']

const require = createRequire(import.meta.url)

const loadEsbuild = () => {
  try {
    return require('esbuild')
  } catch {
    // Vite bundles esbuild; fall back to nested path if not hoisted
    return require('vite/node_modules/esbuild')
  }
}

const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n')

export const syncExtensionCommon = async ({ repoRoot = REPO_ROOT, check = false } = {}) => {
  const esbuild = loadEsbuild()
  const sourceDir = path.join(repoRoot, 'src', 'shared')
  const destDir = path.join(repoRoot, 'clients/extension', 'common')

  await fs.mkdir(destDir, { recursive: true })

  const results = []

  for (const name of SYNC_MODULES) {
    const entry = path.join(sourceDir, `${name}.ts`)
    const outfile = path.join(destDir, `${name}.js`)

    try {
      await fs.access(entry)
    } catch {
      throw new Error(`[extension:sync-common] missing source: ${path.relative(repoRoot, entry)}`)
    }

    const buildResult = await esbuild.build({
      entryPoints: [entry],
      outfile,
      write: false,
      bundle: false,
      format: 'esm',
      platform: 'neutral',
      target: ['es2022'],
      logLevel: 'silent'
    })

    const outputFile = buildResult.outputFiles?.[0]
    if (!outputFile) {
      throw new Error(`[extension:sync-common] esbuild produced no output for ${name}`)
    }

    const nextContent = normalizeNewlines(
      Buffer.from(outputFile.contents).toString('utf8').trimEnd() + '\n'
    )

    const previousContent = await fs.readFile(outfile, 'utf8').then(
      (text) => normalizeNewlines(text),
      () => null
    )

    const changed = previousContent !== nextContent
    results.push({
      name,
      outfile: path.relative(repoRoot, outfile),
      changed,
      missing: previousContent === null
    })

    if (!check && changed) {
      await fs.writeFile(outfile, nextContent, 'utf8')
    }
  }

  return results
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  const check = process.argv.includes('--check')
  const results = await syncExtensionCommon({ check })

  if (check) {
    const dirty = results.filter((item) => item.changed || item.missing)
    if (dirty.length > 0) {
      console.error('[extension:sync-common] drift detected:')
      for (const item of dirty) {
        console.error(`  - ${item.outfile}${item.missing ? ' (missing)' : ' (out of date)'}`)
      }
      console.error('Run: npm run extension:sync-common')
      process.exit(1)
    }
    console.log('[extension:sync-common] in sync')
    process.exit(0)
  }

  for (const item of results) {
    const status = item.changed ? 'updated' : 'unchanged'
    console.log(`[extension:sync-common] ${status} ${item.outfile}`)
  }
}
