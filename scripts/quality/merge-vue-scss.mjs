/**
 * Inline single-use companion .scss files into their Vue SFC <style lang="scss"> blocks.
 * Only merges when the Vue file has exactly one local @use './X.scss'.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const WEB_ROOT = path.join(ROOT, 'src/web')

const walk = (dir, acc = []) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

const vueFiles = walk(WEB_ROOT).filter((f) => f.endsWith('.vue'))
let merged = 0
let skipped = 0
const deleted = []

for (const vuePath of vueFiles) {
  let vue = fs.readFileSync(vuePath, 'utf8')
  const useRe = /@use\s+['"]\.\/([^'"]+\.scss)['"]\s*;?/g
  const matches = [...vue.matchAll(useRe)]
  if (matches.length !== 1) {
    skipped += 1
    continue
  }

  const scssRel = matches[0][1]
  const scssPath = path.join(path.dirname(vuePath), scssRel)
  if (!fs.existsSync(scssPath)) {
    skipped += 1
    continue
  }

  // Skip if another vue in the same directory also @use's this file.
  let otherUsers = 0
  for (const other of vueFiles) {
    if (other === vuePath) continue
    if (path.dirname(other) !== path.dirname(vuePath)) continue
    const text = fs.readFileSync(other, 'utf8')
    if (text.includes(`@use './${scssRel}'`) || text.includes(`@use "./${scssRel}"`)) {
      otherUsers += 1
    }
  }
  if (otherUsers > 0) {
    skipped += 1
    continue
  }

  // Skip shared asset styles (not component companions).
  if (scssPath.includes(`${path.sep}assets${path.sep}`)) {
    skipped += 1
    continue
  }

  const scss = fs
    .readFileSync(scssPath, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
  const styleRe =
    /(<style\b[^>]*lang=["']scss["'][^>]*>)\s*@use\s+['"]\.\/[^'"]+\.scss['"]\s*;?\s*(<\/style>)/i

  if (styleRe.test(vue)) {
    vue = vue.replace(styleRe, `$1\n${scss}\n$2`)
  } else {
    const styleRe2 = /(<style\b[^>]*lang=["']scss["'][^>]*>)([\s\S]*?)(<\/style>)/i
    const m = vue.match(styleRe2)
    if (!m) {
      skipped += 1
      continue
    }
    const body = m[2].replace(useRe, '').trim()
    const newBody = body ? `${scss}\n\n${body}\n` : `${scss}\n`
    vue = vue.replace(styleRe2, `$1\n${newBody}$3`)
  }

  fs.writeFileSync(vuePath, vue)
  fs.unlinkSync(scssPath)
  deleted.push(path.relative(ROOT, scssPath).replace(/\\/g, '/'))
  merged += 1
}

console.log(
  JSON.stringify(
    {
      merged,
      skipped,
      deletedCount: deleted.length,
      deleted
    },
    null,
    2
  )
)
