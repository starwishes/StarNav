import rateLimit from 'express-rate-limit'

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
  keyGenerator: (req) => {
    const username = String((req as { body?: { username?: unknown } }).body?.username || '')
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
// 这里按纯 IP 限流（默认 keyGenerator 即 req.ip），降低同一来源的刷点击频率。
export const clickLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
})
