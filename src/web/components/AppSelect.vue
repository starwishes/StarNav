<template>
  <div
    ref="rootRef"
    class="app-select"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
    :data-selected-value="selectedValueAttr"
    role="combobox"
    :aria-expanded="open"
    :aria-disabled="disabled"
    aria-haspopup="listbox"
    :aria-controls="menuId"
    :aria-activedescendant="open && activeIndex >= 0 ? getOptionId(activeIndex) : undefined"
    :tabindex="disabled ? -1 : 0"
    v-bind="rootAttrs"
    @click="toggleOpen"
    @keydown="handleKeydown"
  >
    <span class="app-select__label" :class="{ 'is-placeholder': isPlaceholder }">
      {{ selectedLabel }}
    </span>
    <span class="app-select__caret" aria-hidden="true"></span>

    <Teleport to="body">
      <transition name="app-select-menu">
        <div
          v-if="open"
          ref="menuRef"
          class="app-select__menu"
          :id="menuId"
          :style="menuStyle"
          role="listbox"
        >
          <button
            v-for="(option, index) in options"
            :key="getOptionKey(option, index)"
            :id="getOptionId(index)"
            type="button"
            class="app-select__option"
            role="option"
            :class="{
              'is-selected': isOptionSelected(option),
              'is-active': activeIndex === index,
              'is-disabled': option.disabled
            }"
            :data-option-value="String(option.value ?? '')"
            :aria-selected="isOptionSelected(option)"
            :disabled="option.disabled"
            @mouseenter="activeIndex = index"
            @click.stop="handleOptionClick(option)"
          >
            <span class="app-select__option-label">{{ option.label }}</span>
            <span v-if="isOptionSelected(option)" class="app-select__option-check">✓</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, useSlots, watch } from 'vue'
import {
  buildSelectOptionsFromSlots,
  computeMenuPosition,
  getOptionKey,
  valueEquals,
  type SelectOption,
  type SelectValue
} from './appSelectHelpers'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    modelValue?: SelectValue
    disabled?: boolean
    placeholder?: string
    modelModifiers?: Record<string, boolean>
  }>(),
  {
    modelValue: undefined,
    disabled: false,
    placeholder: '',
    modelModifiers: () => ({})
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectValue): void
  (e: 'change', value: SelectValue): void
  (e: 'open'): void
  (e: 'close'): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(-1)
const menuStyle = ref<Record<string, string>>({})
const menuId = `app-select-menu-${Math.random().toString(36).slice(2, 10)}`
const getOptionId = (index: number) => `${menuId}-option-${index}`

const rootAttrs = computed(() => {
  const nextAttrs = { ...(attrs as Record<string, unknown>) }
  delete nextAttrs.modelModifiers
  return nextAttrs
})

const options = computed<SelectOption[]>(() => buildSelectOptionsFromSlots(slots.default?.()))

const selectedIndex = computed(() =>
  options.value.findIndex((option) => valueEquals(option.value, props.modelValue))
)

const selectedOption = computed(() =>
  selectedIndex.value >= 0 ? options.value[selectedIndex.value] : null
)

const selectedLabel = computed(() => {
  if (selectedOption.value) {
    return selectedOption.value.label
  }

  return props.placeholder
})

const selectedValueAttr = computed(() => String(props.modelValue ?? ''))
const isPlaceholder = computed(() => !selectedOption.value && Boolean(props.placeholder))

const syncActiveIndex = () => {
  if (selectedIndex.value >= 0 && !options.value[selectedIndex.value]?.disabled) {
    activeIndex.value = selectedIndex.value
    return
  }

  activeIndex.value = options.value.findIndex((option) => !option.disabled)
}

const updateMenuPosition = () => {
  const root = rootRef.value
  const menu = menuRef.value
  if (!root || !menu) {
    return
  }

  menuStyle.value = computeMenuPosition({
    rootRect: root.getBoundingClientRect(),
    menuHeight: menu.offsetHeight,
    optionCount: options.value.length,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  })
}

const closeMenu = () => {
  open.value = false
}

const handleDocumentPointerDown = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) {
    closeMenu()
    return
  }

  if (rootRef.value?.contains(target) || menuRef.value?.contains(target)) {
    return
  }

  closeMenu()
}

const handleViewportChange = () => {
  if (open.value) {
    updateMenuPosition()
  }
}

const attachGlobalListeners = () => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
}

const removeGlobalListeners = () => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
}

const openMenu = async () => {
  if (props.disabled || options.value.every((option) => option.disabled)) {
    return
  }

  syncActiveIndex()
  open.value = true
  await nextTick()
  updateMenuPosition()
}

const toggleOpen = () => {
  if (open.value) {
    closeMenu()
    return
  }

  void openMenu()
}

const handleOptionClick = (option: SelectOption) => {
  if (option.disabled) {
    return
  }

  const changed = !valueEquals(option.value, props.modelValue)
  if (changed) {
    emit('update:modelValue', option.value)
    emit('change', option.value)
  }

  closeMenu()
}

const moveActiveIndex = (direction: 1 | -1) => {
  if (!options.value.length) {
    return
  }

  let nextIndex = activeIndex.value
  for (let step = 0; step < options.value.length; step += 1) {
    nextIndex = (nextIndex + direction + options.value.length) % options.value.length
    if (!options.value[nextIndex]?.disabled) {
      activeIndex.value = nextIndex
      return
    }
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled) {
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!open.value) {
      void openMenu()
      return
    }

    const option = options.value[activeIndex.value]
    if (option) {
      handleOptionClick(option)
    }
    return
  }

  if (event.key === 'Escape') {
    if (open.value) {
      event.preventDefault()
      closeMenu()
    }
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) {
      void openMenu()
      return
    }

    moveActiveIndex(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) {
      void openMenu()
      return
    }

    moveActiveIndex(-1)
  }
}

const isOptionSelected = (option: SelectOption) => valueEquals(option.value, props.modelValue)

watch(open, (isOpen) => {
  if (isOpen) {
    emit('open')
    attachGlobalListeners()
    return
  }

  emit('close')
  removeGlobalListeners()
})

watch(
  () => props.modelValue,
  () => {
    if (open.value) {
      syncActiveIndex()
      nextTick(updateMenuPosition)
    }
  }
)

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      closeMenu()
    }
  }
)

onBeforeUnmount(() => {
  removeGlobalListeners()
})
</script>

<style scoped lang="scss">
.app-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.4);
    outline-offset: 2px;
  }

  &.is-disabled {
    cursor: not-allowed;
  }
}

.app-select__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-placeholder {
    opacity: 0.72;
  }
}

.app-select__caret {
  width: 9px;
  height: 9px;
  border-right: 1.6px solid currentColor;
  border-bottom: 1.6px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
  flex-shrink: 0;
  opacity: 0.72;
  transition: transform 0.18s ease;
}

.app-select.is-open .app-select__caret {
  transform: rotate(-135deg) translate(-1px, 1px);
}

.app-select__menu {
  position: fixed;
  z-index: 3200;
  overflow-y: auto;
  padding: 8px;
  border-radius: 16px;
  background: var(--ui-panel-surface, rgba(255, 255, 255, 0.96));
  border: 1px solid var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(18px);
}

.app-select__option {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ui-text-primary, #0f172a);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;

  &:hover,
  &.is-active {
    background: rgba(var(--ui-theme-rgb), 0.12);
  }

  &.is-selected {
    background: rgba(var(--ui-theme-rgb), 0.16);
    color: rgb(var(--ui-theme-rgb));
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
}

.app-select__option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select__option-check {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
}

.app-select-menu-enter-active,
.app-select-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.app-select-menu-enter-from,
.app-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

:global(:root[theme-mode='dark'] .app-select__menu) {
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.38);
}
</style>
