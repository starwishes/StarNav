import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const testsRoot = path.join(projectRoot, 'tests')

const isTestFile = (name) => name.endsWith('.test.js') || name.endsWith('.test.ts')

const collectTestFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath))
      continue
    }

    if (isTestFile(entry.name)) {
      files.push(path.relative(projectRoot, fullPath).split(path.sep).join('/'))
    }
  }

  return files
}

const testFiles = collectTestFiles(testsRoot)

const countByPrefix = (prefix) => testFiles.filter((file) => file.startsWith(`${prefix}/`)).length

const countDirectChildren = (prefix) =>
  testFiles.filter((file) => path.posix.dirname(file) === prefix).length

const printSection = (title, rows) => {
  console.log(title)
  for (const [label, count] of rows) {
    console.log(`- ${label}: ${count}`)
  }
  console.log('')
}

const topLevelRows = [
  ['backend', countByPrefix('tests/server')],
  ['frontend', countByPrefix('tests/web')],
  ['common', countByPrefix('tests/shared')],
  ['clients/extension', countByPrefix('tests/extension')],
  ['integration', countByPrefix('tests/integration')],
  ['smoke', countByPrefix('tests/smoke')]
]

const backendRows = [
  ['services', countByPrefix('tests/server/services')],
  ['controllers', countByPrefix('tests/server/controllers')],
  ['middleware', countByPrefix('tests/server/middleware')],
  ['utils', countByPrefix('tests/server/utils')],
  ['routes', countByPrefix('tests/server/routes')],
  ['config', countByPrefix('tests/server/config')],
  ['api', countByPrefix('tests/server/api')],
  ['models', countByPrefix('tests/server/models')],
  ['tools', countByPrefix('tests/server/tools')],
  ['root', countDirectChildren('tests/server')]
]

const frontendRows = [
  ['components', countByPrefix('tests/web/components')],
  ['composables', countByPrefix('tests/web/composables')],
  ['store', countByPrefix('tests/web/store')],
  ['utils', countByPrefix('tests/web/utils')],
  ['api', countByPrefix('tests/web/api')],
  ['views', countByPrefix('tests/web/views')],
  ['router', countByPrefix('tests/web/router')],
  ['plugins', countByPrefix('tests/web/plugins')],
  ['config', countByPrefix('tests/web/config')],
  ['root', countDirectChildren('tests/web')]
]

console.log('Test coverage surface (file-based)')
console.log(`- total test files: ${testFiles.length}`)
console.log('')

printSection('Top-level areas', topLevelRows)
printSection('Backend layers', backendRows)
printSection('Frontend layers', frontendRows)
