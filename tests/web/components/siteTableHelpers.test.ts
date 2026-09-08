// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { formatRelativeDate } from '../../../src/web/components/siteTableHelpers.ts'

/** 固定"现在"避免相对时间断言随运行时刻漂移。 */
const NOW = new Date('2026-04-13T10:00:00.000Z')
const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${String(params.n)}` : key

describe('formatRelativeDate', () => {
  it('renders relative buckets inside 7 days', () => {
    expect(formatRelativeDate('2026-04-13T09:59:30.000Z', t, {}, NOW)).toBe('time.justNow')
    expect(formatRelativeDate('2026-04-13T09:55:00.000Z', t, {}, NOW)).toBe('time.minutesAgo:5')
    expect(formatRelativeDate('2026-04-13T08:00:00.000Z', t, {}, NOW)).toBe('time.hoursAgo:2')
    expect(formatRelativeDate('2026-04-10T10:00:00.000Z', t, {}, NOW)).toBe('time.daysAgo:3')
  })

  it('renders an absolute date past 7 days in the configured timeZone/locale', () => {
    // 2026-04-01T10:00:00Z 在 Asia/Shanghai 已是 04-01 18:00，按站点时区应显示 04-01
    expect(
      formatRelativeDate(
        '2026-04-01T10:00:00.000Z',
        t,
        { locale: 'en-US', timeZone: 'Asia/Shanghai' },
        NOW
      )
    ).toBe('04/01/2026')
    // 同一时刻在 UTC-11 时区仍是 03-31，证明绝对分支确实使用了传入时区而非浏览器本地时区
    expect(
      formatRelativeDate(
        '2026-04-01T10:00:00.000Z',
        t,
        { locale: 'en-US', timeZone: 'Etc/GMT+11' },
        NOW
      )
    ).toBe('03/31/2026')
  })

  it('falls back to locale default formatting when timeZone is rejected by Intl', () => {
    // fallback 走 date.toLocaleDateString(locale)（无 timeZone → 机器本地时区）。断言不能用
    // 固定日期字符串：2026-04-01T10:00:00Z 在 UTC−11（美属萨摩亚）渲染 03/31、UTC+14
    // （基里巴斯）渲染 04/02，固定 '4/1/2026' 依赖机器时区（第 24 轮平台差异同族）。
    // 现场用同一 API 算期望值，断言只验证"与裸 toLocaleDateString 一致"这一 fallback 语义。
    const expected = new Date('2026-04-01T10:00:00.000Z').toLocaleDateString('en-US')
    expect(
      formatRelativeDate(
        '2026-04-01T10:00:00.000Z',
        t,
        { locale: 'en-US', timeZone: 'Not/AZone' },
        NOW
      )
    ).toBe(expected)
  })

  it('renders a dash for unparseable timestamps instead of throwing', () => {
    // 非法/空值曾使 diff 为 NaN 并落入 Intl.format(Invalid Date) 抛 RangeError，整表崩溃；
    // 现在与 formatDateTime 的 NaN fallback 对齐直接返回 '-'
    expect(formatRelativeDate('not-a-date', t, {}, NOW)).toBe('-')
    expect(formatRelativeDate('2026-13-99T99:99:99.000Z', t, {}, NOW)).toBe('-')
  })
})
