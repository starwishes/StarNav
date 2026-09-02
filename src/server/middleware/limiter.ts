import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import crypto from 'node:crypto'

// 登录限流按 IP+用户名 复合 key：
// 默认 TRUST_PROXY=true（信任一层反代），真实客户端 IP 取自 X-Forwarded-For；
// 复合 key 确保即使多个用户共享同一出口 IP（反代/NAT），爆破某一账号也不会
// 波及其他账号。
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
  // 注意 key 的退化语义：请求缺少 body 或 body 解析失败时，username 取空字符串，
  // 复合 key 退化为纯 IP key——同一 IP 的所有用户名共享同一个计数桶。这是有意
  // 的保守行为（拿不到用户名时按 IP 整体限流），而不是绕过限流的缺口。
  // 用户名做 trim + 小写归一，避免攻击者用大小写/首尾空格变体绕过“每账号”限额。
  keyGenerator: (req) => {
    const rawUsername = String((req as { body?: { username?: unknown } }).body?.username || '')
    const username = rawUsername.trim().toLowerCase()
    // ipKeyGenerator 对 IPv6 做子网归一，避免 IPv6 用户绕过按 IP 的限流
    return `${ipKeyGenerator(req.ip || '')}:${username.slice(0, 30)}`
  },
  message: { success: false, code: 'RATE_LIMITED', error: '尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const dataUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', error: '更新过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// 登录/注册的纯 IP 兜底桶：loginLimiter 按 IP+username 拆桶，攻击者轮换
// 用户名即获得新桶；这里再按纯 IP 限制整体尝试次数，封住轮换用户名刷登录。
// 与 clickLimiter/clickIpLimiter 的组合思路一致（见下方点击限流注释）。
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
  message: { success: false, code: 'RATE_LIMITED', error: '尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const faviconLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const healthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// /api/suggest 是公开外呼代理（无鉴权），挂限流避免被当作免费 suggest API / 出站请求洪水
export const suggestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// 点击计数是公开写接口（无需登录），仅靠通用 dataUpdateLimiter 无法防脚本刷量。
// 默认 TRUST_PROXY=true（真实 IP 取自 X-Forwarded-For）；混入 UA 指纹把桶按
// “客户端”拆开，避免单个高频用户/脚本拖累全站。
export const clickLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => {
    const ua = String(req.get('user-agent') || '')
    const fingerprint = crypto.createHash('sha1').update(ua).digest('hex').slice(0, 12)
    // ipKeyGenerator 对 IPv6 做子网归一，避免 IPv6 用户绕过按 IP 的限流
    return `${ipKeyGenerator(req.ip || '')}:${fingerprint}`
  },
  message: { success: false, code: 'RATE_LIMITED', error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// 二级熔断：UA 可被脚本伪造轮换（每换一个 UA 就获得新计数桶），
// 因此再加一道按纯 IP 的总量上限，兜住轮换 UA 的刷量脚本。
// 注意：TRUST_PROXY=true（默认）且反代正确透传/追加 X-Forwarded-For 时，
// req.ip 为真实客户端 IP，按真实 IP 分桶；仅当显式 TRUST_PROXY=false
// 且经反代部署时才会共享反代出口桶。
export const clickIpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 180,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, code: 'RATE_LIMITED', error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})
