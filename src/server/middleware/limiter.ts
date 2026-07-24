import rateLimit from 'express-rate-limit'

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test',
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
