import pkg from '../../../package.json'

import { describe, expect, it } from 'vitest'

import { Favicon, ICP_NUMBER, RELEASE, SITE_NAME } from '@/config'

describe('frontend config constants', () => {
  it('exports the expected site metadata and derived version string', () => {
    expect(SITE_NAME).toBe('星语导航')
    expect(ICP_NUMBER).toBe('')
    expect(RELEASE).toBe(`v${pkg.version}`)
    expect(Favicon).toBe('/api/favicon?url=')
  })
})
