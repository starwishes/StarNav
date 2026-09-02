import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 根目录路径（src/server/config → 上三级到仓库根）
const ROOT_DIR = path.resolve(__dirname, '../../../')

// 数据目录，优先使用环境变量 DATA_PATH，默认使用项目根目录下的 data 文件夹
// 在 Docker 环境中通常会被设置为 /app/data
export const DATA_DIR = process.env.DATA_PATH || path.join(ROOT_DIR, 'data')

// 保留的路径常量
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
export const JWT_SECRET_PATH = path.join(DATA_DIR, '.jwt_secret')
export const ADMIN_BOOTSTRAP_PASSWORD_PATH = path.join(DATA_DIR, '.admin_bootstrap_password')

/**
 * 默认管理员名称 (主数据拥有者)
 */
export const DEFAULT_ADMIN_NAME = process.env.ADMIN_USERNAME || 'admin'
/**
 * 默认信任一层反向代理：Express 从 X-Forwarded-For 读取真实客户端 IP，
 * 日志/会话/限流均按真实 IP 处理（覆盖最常见的反代部署形态）。
 * 仅当应用端口直连公网（无受信任反代）时显式设为 "false"，
 * 避免客户端伪造 X-Forwarded-For 头绕过基于 IP 的限流。
 */
export const TRUST_PROXY = process.env.TRUST_PROXY !== 'false'

const TEST_JWT_SECRET = 'test-jwt-secret-for-vitest-only-0123456789abcdef'
const isTestRuntime = () =>
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.VITEST_WORKER_ID !== undefined

/**
 * 获取 JWT 密钥
 * 优先级：环境变量 JWT_SECRET > 测试运行时固定密钥 > 文件 .jwt_secret > 自动生成
 */
export const getOrCreateJwtSecret = () => {
  // 1. 优先使用环境变量
  if (process.env.JWT_SECRET) {
    logger.info('使用来自环境变量的 JWT_SECRET')
    return process.env.JWT_SECRET
  }

  // 2. 测试运行时使用固定内存密钥，避免污染仓库数据目录
  if (isTestRuntime()) {
    return TEST_JWT_SECRET
  }

  // 3. 尝试从文件读取
  try {
    if (fs.existsSync(JWT_SECRET_PATH)) {
      const secret = fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim()
      if (secret) {
        return secret
      }
      logger.warn(`.jwt_secret 文件为空，将重新生成`)
    }

    // 4. 自动生成并保存到文件
    const secret = crypto.randomBytes(32).toString('hex')
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(JWT_SECRET_PATH, secret, { mode: 0o600 })
    logger.warn('已生成新的 JWT_SECRET 并保存到文件。注意：旧的 Token 将失效。')
    return secret
  } catch (err) {
    logger.error('获取或创建 JWT 密钥失败', err)
    logger.error(
      '⚠️  使用临时 JWT 密钥继续启动：每次重启都会生成新密钥，所有已登录会话将在重启后失效。请检查 DATA_DIR 权限并设置 JWT_SECRET 环境变量'
    )
    return crypto.randomBytes(32).toString('hex')
  }
}

export const JWT_SECRET = getOrCreateJwtSecret()

/**
 * 旧 JSON 时代用户数据文件路径，仅供迁移逻辑使用
 */
export const getUserDataPath = (username: string) => {
  // 只有主管理员的数据保存在根目录 data.json，作为游客展示的默认数据
  if (username === DEFAULT_ADMIN_NAME) return path.join(DATA_DIR, 'data.json')
  return path.join(DATA_DIR, 'users', `${username}.json`)
}

/**
 * 环境变量校验
 * 启动时检查关键配置，避免低级错误
 */
export const validateEnv = () => {
  const errors: string[] = []
  const warnings: string[] = []
  const isProduction = process.env.NODE_ENV === 'production'
  const authCookieSecure = process.env.AUTH_COOKIE_SECURE
  const cspUpgradeInsecureRequests = process.env.CSP_UPGRADE_INSECURE_REQUESTS
  const trustProxy = process.env.TRUST_PROXY
  const bootstrapPasswordDelivery = (process.env.ADMIN_BOOTSTRAP_PASSWORD_DELIVERY || '')
    .trim()
    .toLowerCase()

  // 已知泄露值（曾作为 .env.example 示例发布，禁止复用）
  const KNOWN_LEAKED_JWT_SECRETS = new Set([
    'rucL6_4F8NDlKvQ0WBUPhbvos9xjIOoYQd65i-4HJcs83FsM6Ufr1RqeImf9NzAn'
  ])
  const KNOWN_LEAKED_ADMIN_PASSWORDS = new Set(['UkTm7hXOUp27pbRFsY88GoS8'])

  // 1. JWT_SECRET 校验
  const jwtSecret = process.env.JWT_SECRET || ''
  if (jwtSecret.length > 0 && jwtSecret.length < 32) {
    errors.push('JWT_SECRET 长度不足（最少 32 字符）。推荐使用: openssl rand -base64 64')
  }
  if (KNOWN_LEAKED_JWT_SECRETS.has(jwtSecret)) {
    if (isProduction) {
      errors.push(`JWT_SECRET 是已公开泄露的示例值，生产环境必须更换为随机长字符串！`)
    } else {
      warnings.push(`JWT_SECRET 使用了已公开泄露的示例值，建议更换以增强安全性`)
    }
  }
  if (
    jwtSecret === 'your-secret-key-here' ||
    jwtSecret === 'generate-a-long-random-string-here-for-production-security' ||
    jwtSecret === 'change-me-to-a-random-string-for-security' ||
    jwtSecret === 'change-me-to-a-random-string-for-security-for-security'
  ) {
    if (isProduction) {
      errors.push(`JWT_SECRET 仍使用默认值 [${jwtSecret}]，生产环境必须更换为随机长字符串！`)
    } else {
      warnings.push(`JWT_SECRET 使用了默认占位符 [${jwtSecret}]，建议更换以增强安全性`)
    }
  }

  // 2. ADMIN_PASSWORD 校验
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  if (adminPassword.length > 0 && adminPassword.length < 8) {
    warnings.push('ADMIN_PASSWORD 长度不足 8 字符，建议使用更强的密码')
  }
  if (KNOWN_LEAKED_ADMIN_PASSWORDS.has(adminPassword)) {
    if (isProduction) {
      errors.push('ADMIN_PASSWORD 是已公开泄露的示例值，生产环境必须更换！')
    } else {
      warnings.push('ADMIN_PASSWORD 使用了已公开泄露的示例值，建议更换以增强安全性')
    }
  }

  // 3. ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 校验
  if (
    bootstrapPasswordDelivery !== '' &&
    !['file', 'log', 'both'].includes(bootstrapPasswordDelivery)
  ) {
    errors.push('ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 仅支持 "file"、"log"、"both" 或留空默认 file')
  }

  if (
    isProduction &&
    bootstrapPasswordDelivery &&
    ['log', 'both'].includes(bootstrapPasswordDelivery)
  ) {
    warnings.push(
      'ADMIN_BOOTSTRAP_PASSWORD_DELIVERY 包含 log：初始密码将写入运行日志，请仅在受控环境临时使用'
    )
  }

  // 4. CORS_ORIGINS 校验（生产环境）
  if (isProduction) {
    const corsOrigins = process.env.CORS_ORIGINS || ''
    if (corsOrigins === '*') {
      errors.push('生产环境禁止 CORS_ORIGINS 设置为 "*"，请指定具体域名')
    }
    if (!corsOrigins) {
      warnings.push('生产环境建议设置 CORS_ORIGINS 以限制访问来源')
    }

    // TLS 终止在反代、又未配置 CORS_ORIGINS 时：
    // 计算出的请求源为 http://host，而浏览器 Origin 为 https://host，
    // 会导致所有 Cookie 写请求 403（fail-closed 但难以排查）。提前提示。
    // 此分支仅在 TRUST_PROXY=false 时触发，顺带提醒该配置的 IP 语义副作用。
    if (!corsOrigins && trustProxy === 'false') {
      warnings.push(
        '若 HTTPS 由反向代理终止：请配置 CORS_ORIGINS 为实际访问域名，否则基于 Cookie 的写请求可能全部被来源校验拒绝（403）；同时 TRUST_PROXY=false 会使会话/审计 IP 显示为反代出口'
      )
    }
  }

  // 5. PORT 校验
  const port = parseInt(process.env.PORT || '8080', 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`PORT 配置无效: ${process.env.PORT}，必须在 1-65535 之间`)
  }

  // 6. AUTH_COOKIE_SECURE 校验
  if (
    authCookieSecure !== undefined &&
    authCookieSecure !== '' &&
    authCookieSecure !== 'true' &&
    authCookieSecure !== 'false'
  ) {
    errors.push('AUTH_COOKIE_SECURE 仅支持 "true"、"false" 或留空自动判断')
  }

  if (authCookieSecure === 'false' && isProduction) {
    warnings.push('AUTH_COOKIE_SECURE=false：生产环境将允许 HTTP Cookie，会降低后台会话安全性')
  }

  if (!authCookieSecure && isProduction) {
    warnings.push('AUTH_COOKIE_SECURE 未显式设置，将按请求协议和 X-Forwarded-Proto 自动判断')
  }

  // 7. CSP_UPGRADE_INSECURE_REQUESTS 校验
  if (
    cspUpgradeInsecureRequests !== undefined &&
    cspUpgradeInsecureRequests !== '' &&
    cspUpgradeInsecureRequests !== 'true' &&
    cspUpgradeInsecureRequests !== 'false'
  ) {
    errors.push('CSP_UPGRADE_INSECURE_REQUESTS 仅支持 "true"、"false" 或留空关闭')
  }

  if (cspUpgradeInsecureRequests === 'true') {
    warnings.push(
      'CSP_UPGRADE_INSECURE_REQUESTS=true：请确认所有外部图片、图标和脚本依赖都支持 HTTPS'
    )
  }

  // 8. TRUST_PROXY 校验
  // 默认信任一层反向代理（TRUST_PROXY=true）：Express 从 X-Forwarded-For 读取
  // 真实客户端 IP，日志/会话/限流均按真实 IP 记录。仅当应用端口直连公网
  // （无受信任反代）时建议显式 TRUST_PROXY=false，避免客户端伪造
  // X-Forwarded-For 头绕过基于 IP 的限流（见 middleware/limiter.ts）。
  if (
    trustProxy !== undefined &&
    trustProxy !== '' &&
    trustProxy !== 'true' &&
    trustProxy !== 'false'
  ) {
    errors.push('TRUST_PROXY 仅支持 "true"、"false" 或留空（默认 true）')
  }

  if (trustProxy === 'false') {
    warnings.push(
      'TRUST_PROXY=false：若经反向代理部署，会话/审计日志将显示反代出口 IP 而非真实客户端 IP'
    )
  }

  // 方案 B：生产环境未显式设置 TRUST_PROXY 时给出告警。
  // 默认 trust proxy=1 意味着“信任一层反代”，会无条件采纳 X-Forwarded-For；
  // 若端口直连公网（compose 默认 8080:8080 暴露，无受信任反代），攻击者可
  // 伪造 XFF 绕过按 IP 的限流并污染会话/审计 IP。
  if (isProduction && (trustProxy === undefined || trustProxy === '')) {
    warnings.push(
      'TRUST_PROXY 未显式设置（默认信任一层反代）：若本服务端口直连公网（无反向代理），客户端可伪造 X-Forwarded-For 头绕过基于 IP 的限流并污染审计 IP，建议显式设置 TRUST_PROXY=false'
    )
  }

  // 输出结果
  if (errors.length > 0) {
    logger.error('❌ 环境变量校验失败:')
    errors.forEach((err) => logger.error(`   - ${err}`))
    logger.error('\n请修正以上配置后重启服务\n')
    process.exit(1)
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  环境变量配置建议:')
    warnings.forEach((warn) => logger.warn(`   - ${warn}`))
  }

  logger.info('✅ 环境变量校验通过')
}
