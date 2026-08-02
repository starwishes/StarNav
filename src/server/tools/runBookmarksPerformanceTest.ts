import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../../../')
const scriptPath = process.argv[2] || 'tests/performance/bookmarks-load.js'
const passthroughEnv = [
  'BASE_URL',
  'TEST_USERNAME',
  'TEST_PASSWORD',
  'SEARCH_KEYWORD',
  'K6_PROFILE'
]

const runOrExit = (command: string, args: string[], options: Record<string, unknown> = {}) => {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    ...options
  })

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }

    throw result.error
  }

  process.exit(result.status ?? 1)
}

const localK6 = spawnSync('k6', ['version'], {
  cwd: ROOT_DIR,
  stdio: 'ignore',
  env: process.env
})

if (localK6.status === 0) {
  runOrExit('k6', ['run', scriptPath])
}

if (process.platform !== 'linux') {
  console.error('未检测到本机 k6；当前 Docker fallback 仅对 Linux/WSL 默认开放。请先安装 k6。')
  process.exit(1)
}

const dockerArgs = ['run', '--rm', '--network', 'host', '-v', `${ROOT_DIR}:/work`, '-w', '/work']

for (const envKey of passthroughEnv) {
  if (process.env[envKey]) {
    dockerArgs.push('-e', `${envKey}=${process.env[envKey]}`)
  }
}

dockerArgs.push('grafana/k6:latest', 'run', scriptPath)

if (runOrExit('docker', dockerArgs) === null) {
  console.error('未检测到本机 k6，且当前环境也不可用 docker。请先安装其中之一。')
  process.exit(1)
}
