import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/web/utils/feedback.ts', () => ({
  ElMessage: { error: vi.fn() }
}))
vi.mock('../../src/web/plugins/i18n.ts', () => ({
  default: { global: { t: (key: string) => `t:${key}` } }
}))

const loadHelpers = async () => {
  const feedback = await import('../../src/web/utils/feedback.ts')
  const helpers = await import('../../src/web/utils/unexpectedErrorFeedback.ts')
  return { ElMessage: feedback.ElMessage, ...helpers }
}

type Helpers = Awaited<ReturnType<typeof loadHelpers>>

describe('unexpectedErrorFeedback', () => {
  let ElMessage: Helpers['ElMessage']
  let notifyUnexpectedError: Helpers['notifyUnexpectedError']
  let notifyStaleAssetReloadNeeded: Helpers['notifyStaleAssetReloadNeeded']

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    // 节流依赖 Date.now()：fake Date 让 setSystemTime/advanceTimersByTime 可推进时间线；
    // 每次测试重新加载模块，避免模块级 lastShownAt 跨测试泄漏。
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-02T00:00:00.000Z'))
    ;({ ElMessage, notifyUnexpectedError, notifyStaleAssetReloadNeeded } = await loadHelpers())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throttles repeated global error toasts to one per window', () => {
    notifyUnexpectedError()
    notifyUnexpectedError()
    notifyUnexpectedError()

    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('t:feedback.unexpectedError')
  })

  it('allows another toast after the throttle window elapses', () => {
    notifyUnexpectedError()
    vi.advanceTimersByTime(31_000)
    notifyUnexpectedError()

    expect(ElMessage.error).toHaveBeenCalledTimes(2)
  })

  it('notifies the user with the stale-assets message when recovery is skipped', () => {
    notifyStaleAssetReloadNeeded()

    expect(ElMessage.error).toHaveBeenCalledTimes(1)
    expect(ElMessage.error).toHaveBeenCalledWith('t:feedback.staleAssetsReload')
  })
})
