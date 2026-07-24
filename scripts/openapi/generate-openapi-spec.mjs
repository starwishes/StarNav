/* global console, process */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { getSwaggerSpec } from '../../src/server/config/swagger.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')
const OUTPUT_PATH = path.join(REPO_ROOT, 'dist', 'api-docs.json')

export const generateOpenApiSpec = async (outputPath = OUTPUT_PATH) => {
  const swaggerSpec = await getSwaggerSpec()
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
