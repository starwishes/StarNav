import { describe, expect, it, vi } from 'vitest'

import { escapeHtml, fillSelectOptions } from '../../clients/extension/utils/dom.js'

describe('extension dom helpers', () => {
  it('escapes html entities and returns empty for nullish values', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(42)).toBe('42')
  })

  it('fills a select element with placeholder and option nodes', () => {
    const select = globalThis.document.createElement('select')
    const appendChild = vi.spyOn(select, 'appendChild')

    fillSelectOptions(
      select,
      [
        { value: 'a', label: 'Alpha' },
        { value: 2, label: 'Two' }
      ],
      { placeholder: 'Pick' }
    )

    expect(appendChild).toHaveBeenCalledTimes(3)
    const options = select.querySelectorAll('option')
    expect(options[0].value).toBe('')
    expect(options[0].textContent).toBe('Pick')
    expect(options[1].value).toBe('a')
    expect(options[1].textContent).toBe('Alpha')
    expect(options[2].value).toBe('2')
    expect(options[2].textContent).toBe('Two')
  })

  it('clears existing options and skips placeholder when omitted', () => {
    const select = globalThis.document.createElement('select')
    select.innerHTML = '<option>old</option>'
    const appendChild = vi.spyOn(select, 'appendChild')

    fillSelectOptions(select, [{ value: 'x', label: 'X' }])

    expect(appendChild).toHaveBeenCalledTimes(1)
    expect(select.querySelectorAll('option')).toHaveLength(1)
    expect(select.querySelector('option').textContent).toBe('X')
  })

  it('returns early when the select element is missing', () => {
    expect(() => fillSelectOptions(null, [{ value: 'a', label: 'A' }])).not.toThrow()
  })
})
