import rateLimit from 'express-rate-limit'
import crypto from 'node:crypto'

// 登录限流按 IP+用户名 复合 key：
// 默认 TRUST_PROXY 关闭，反向代理后所有请求共享同一个出口 IP，若仅按 IP 计数，
// 单个 IP 下所有账号会一起被锁定（全站 10 次/15 分钟误锁）。按 IP+username 拆开
// 后，攻击者爆破某一账号不会波及其他账号。
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
    return `${req.ip}:${username.slice(0, 30)}`
  },
  message: { error: '尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const dataUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: '更新过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const faviconLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

export const healthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// 点击计数是公开写接口（无需登录），仅靠通用 dataUpdateLimiter 无法防脚本刷量。
// 反代后 TRUST_PROXY 关闭时 req.ip 恒为代理出口 IP，所有访客会共享一个计数桶。
// 混入 UA 指纹把桶按“客户端”拆开，避免单个高频用户/脚本拖累全站。
export const clickLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => {
    const ua = String(req.get('user-agent') || '')
    const fingerprint = crypto.createHash('sha1').update(ua).digest('hex').slice(0, 12)
    return `${req.ip}:${fingerprint}`
  },
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})

// 二级熔断：UA 可被脚本伪造轮换（每换一个 UA 就获得新计数桶），
// 因此再加一道按纯 IP 的总量上限，兜住轮换 UA 的刷量脚本。
// 注意：TRUST_PROXY 关闭（默认）时 req.ip 为反代出口 IP，全站共享此桶——
// 阈值按"一个站点总点击 3 次/秒"量级设置，部署文档要求反代场景显式开启
// TRUST_PROXY 以按真实 IP 分桶。
export const clickIpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 180,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})
