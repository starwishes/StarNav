import { nextTick } from 'vue'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'

type TriggerableWrapper = VueWrapper<any> | DOMWrapper<Element>

const collectSearchRoots = (wrapper: TriggerableWrapper) => {
  const roots: ParentNode[] = [document.body]
  let current: Element | null = wrapper.element
  let topmost: Element | null = wrapper.element

  while (current?.parentElement) {
    topmost = current.parentElement
    current = current.parentElement
  }

  if (topmost) {
    roots.push(topmost)
  }

  return roots
}

const findOptionButton = (wrapper: TriggerableWrapper, value: string | number) => {
  const optionValue = String(value)

  for (const root of collectSearchRoots(wrapper)) {
    const option = Array.from(root.querySelectorAll<HTMLElement>('.app-select__option')).find(
      (element) => element.dataset.optionValue === optionValue
    )

    if (option) {
      return option
    }
  }

  return null
}

export const getAppSelectValue = (wrapper: VueWrapper<any>, selector: string) =>
  wrapper.find(selector).attributes('data-selected-value')

export const chooseAppSelectOption = async (
  wrapper: TriggerableWrapper,
  value: string | number
) => {
  const option = findOptionButton(wrapper, value)
  if (!option) {
    throw new Error(`AppSelect option "${String(value)}" not found`)
  }

  option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

export const openAppSelect = async (wrapper: TriggerableWrapper) => {
  await wrapper.trigger('click')
  await nextTick()
}

export const selectAppOption = async (wrapper: TriggerableWrapper, value: string | number) => {
  await openAppSelect(wrapper)
  await chooseAppSelectOption(wrapper, value)
}
