import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppIcon from '../../../src/web/components/AppIcon.vue'

describe('AppIcon', () => {
  it('renders the shared icon font classes and passes through the icon name', () => {
    const wrapper = mount(AppIcon, {
      props: {
        name: 'icon-home'
      }
    })

    expect(wrapper.find('i').classes()).toEqual(
      expect.arrayContaining(['iconfont', 'sn-icon', 'icon-home'])
    )
    expect(wrapper.find('i').attributes('aria-hidden')).toBe('true')
  })
})
