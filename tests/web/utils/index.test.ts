import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { openUrl } from '@/utils'

describe('openUrl', () => {
  const openSpy = vi.spyOn(window, 'open')

  beforeEach(() => {
    openSpy.mockClear()
  })

  afterEach(() => {
    openSpy.mockReset()
  })

  it('opens http(s) URLs in a new tab with noopener and noreferrer', () => {
    openUrl('https://example.com/docs')

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/docs',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('opens site-relative paths without blocking internal navigation', () => {
    openUrl('/admin/dashboard')

    expect(openSpy).toHaveBeenCalledWith('/admin/dashboard', '_blank', 'noopener,noreferrer')
  })

  it('never calls window.open for javascript: URLs', () => {
    openUrl('javascript:alert(document.cookie)')
    openUrl('  javascript:alert(1)  ')

    expect(openSpy).not.toHaveBeenCalled()
  })

  it('rejects other unsafe schemes and blank input', () => {
    openUrl('data:text/html,<script>alert(1)</script>')
    openUrl('vbscript:msgbox(1)')
    openUrl('file:///etc/passwd')
    openUrl('')

    expect(openSpy).not.toHaveBeenCalled()
  })
})
