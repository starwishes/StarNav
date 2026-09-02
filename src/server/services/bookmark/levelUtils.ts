import { USER_LEVEL } from '../../../shared/constants.js'
import type { LevelLike } from '../../types/domain.js'

/** 表示"所有等级"的哨兵值，用于构建全量快照/全量缓存 */
export const ALL_LEVELS = 999

/**
 * 归一化访问等级为整数并钳制在 [GUEST, ADMIN] 范围。
 * 非法输入回退 0；负值/超上限（如损坏数据里的 level>3）按边界处理，
 * 避免生成无法被 clearDataCache 清掉的 `data:level:N` 键或空快照。
 */
export const normalizeLevel = (level: LevelLike = 0): number => {
  const parsed = Number.parseInt(String(level ?? 0), 10)
  if (Number.isNaN(parsed)) {
    return USER_LEVEL.GUEST
  }
  return Math.min(Math.max(parsed, USER_LEVEL.GUEST), USER_LEVEL.ADMIN)
}
