// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG, USER_LEVEL } from '../../src/shared/constants.js'

describe('shared constants', () => {
  it('exports the expected user levels and baseline defaults', () => {
    expect(USER_LEVEL).toEqual({
      GUEST: 0,
      USER: 1,
      VIP: 2,
      ADMIN: 3
    })
    expect(DEFAULT_CONFIG).toEqual({
      PAGE_SIZE: 50,
      MAX_LOGIN_ATTEMPTS: 5
    })
  })
})
