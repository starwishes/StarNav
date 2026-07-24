/**
 * 统一常量定义 (Shared Constants)
 * 适用于: Backend, Frontend, Browser Extension
 */

export const USER_LEVEL = {
  GUEST: 0,
  USER: 1,
  VIP: 2,
  ADMIN: 3
} as const

export type UserLevel = (typeof USER_LEVEL)[keyof typeof USER_LEVEL]

export const DEFAULT_CONFIG = {
  PAGE_SIZE: 50,
  MAX_LOGIN_ATTEMPTS: 5,
  JWT_EXPIRES_IN: '7d'
} as const
