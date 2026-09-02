import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { getSwaggerSpec } from '../../src/server/config/swagger.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')
const OUTPUT_PATH = path.join(REPO_ROOT, 'dist', 'api-docs.json')

// 提取 router.<method>('<path>', ...) 声明；路径支持跨行书写（\s* 兼容换行）。
const ROUTER_CALL_RE = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g

/**
 * 全量比对"路由文件声明的路径 ↔ 生成的 spec path"。
 * 防再犯：新增/修改路由时若漏写 @swagger 注解，openapi:generate 直接报错退出。
 * 仅识别字符串字面量路径（当前三个路由文件均为字面量），并做 :param → {param} 归一。
 */
const normalizeSpecPath = (routePath) => routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')

export const assertRoutesCoveredBySpec = async (spec, repoRoot = REPO_ROOT) => {
  const routesDir = path.join(repoRoot, 'src', 'server', 'routes')
  const specPaths = new Set(Object.keys(spec.paths || {}))

  const missing = []
  const files = (await fs.readdir(routesDir)).filter((name) => /\.(ts|js)$/.test(name))

  for (const name of files) {
    const content = await fs.readFile(path.join(routesDir, name), 'utf8')
    for (const match of content.matchAll(ROUTER_CALL_RE)) {
      const method = match[1].toUpperCase()
      const declaredPath = normalizeSpecPath(match[2])
      if (!specPaths.has(declaredPath)) {
        missing.push(`${method} ${declaredPath} (${name})`)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `OpenAPI spec 缺少以下路由声明的 path（请在对应路由补 @swagger 注解）：\n${missing.join('\n')}`
    )
  }
}

export const generateOpenApiSpec = async (outputPath = OUTPUT_PATH) => {
  const swaggerSpec = await getSwaggerSpec()
  await assertRoutesCoveredBySpec(swaggerSpec)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(swaggerSpec, null, 2)}\n`)
  return outputPath
}

const shouldRunAsScript =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (shouldRunAsScript) {
  const outputPath = await generateOpenApiSpec()
  console.log(`[openapi:generate] wrote ${path.relative(REPO_ROOT, outputPath)}`)
}
