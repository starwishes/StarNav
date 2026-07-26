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
            type="button"
            class="app-select__option"
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  useAttrs,
  useSlots,
  watch
} from 'vue'
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
@use './AppSelect.scss';
</style>
