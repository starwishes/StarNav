// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { i18n } from '../../clients/extension/popup/modules/constants.js'

const listKeys = (dictionary) => Object.keys(dictionary).sort()

describe('extension popup i18n dictionaries', () => {
  it('keeps zh and en dictionaries in key parity (zh ⊆ en and en ⊆ zh)', () => {
    const zhKeys = listKeys(i18n.zh)
    const enKeys = listKeys(i18n.en)
    const zhSet = new Set(zhKeys)
    const enSet = new Set(enKeys)

    const zhMissingInEn = zhKeys.filter((key) => !enSet.has(key))
    const enMissingInZh = enKeys.filter((key) => !zhSet.has(key))

    expect(zhMissingInEn).toEqual([])
    expect(enMissingInZh).toEqual([])
  })

  it('exposes the logout confirmation toast in both languages', () => {
    expect(i18n.zh.loggedOut).toBe('已退出登录')
    expect(i18n.en.loggedOut).toBe('Logged out')
  })
})
