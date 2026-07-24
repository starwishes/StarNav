<template>
  <div ref="root" class="engine-selector">
    <button
      ref="trigger"
      type="button"
      class="mode-btn engine-btn"
      :class="{ active: searchMode === 'online' }"
      :title="currentEngine?.name || '在线搜索'"
      @click.stop="toggleMenu"
    >
      <img
        v-if="currentEngine?.url && getEngineIcon(currentEngine.url)"
        :src="getEngineIcon(currentEngine.url)"
        class="engine-icon"
        alt="icon"
        @error="markEngineIconBroken(currentEngine.url)"
      />
      <div v-else-if="currentEngine?.name" class="engine-icon-badge">
        {{ getEngineInitial(currentEngine.name) }}
      </div>
      <AppIcon v-else name="icon-chrome" class="fallback-icon" />
    </button>

    <Teleport to="body">
      <transition name="engine-menu">
        <div v-if="menuOpen" ref="panel" class="engine-panel" :style="panelStyle" @click.stop>
          <div class="engine-list">
            <button
              v-for="(engine, index) in engines"
              :key="engine.id || `${engine.name}-${engine.url}-${index}`"
              type="button"
              class="engine-item"
              :class="{ active: isCurrentEngine(engine) }"
              @click="handleSelect(engine)"
            >
              <div class="engine-info">
                <img
                  v-if="getEngineIcon(engine.url)"
                  :src="getEngineIcon(engine.url)"
                  class="engine-icon-list"
                  alt="icon"
                  loading="lazy"
                  decoding="async"
                  @error="markEngineIconBroken(engine.url)"
                />
                <div v-else class="engine-icon-list engine-icon-badge engine-icon-badge--list">
                  {{ getEngineInitial(engine.name) }}
                </div>
                <span class="name">{{ engine.name }}</span>
                <span
                  v-if="engine.url && !isSuggestionSupported(engine)"
                  class="search-capability-badge"
                  title="当前仅支持直接搜索，不提供联想词"
                >
                  仅搜索
                </span>
              </div>
              <AppIcon v-if="isCurrentEngine(engine)" name="icon-md-checkmark" class="check-icon" />

              <div v-if="showActions" class="action-group">
                <AppIcon
                  name="icon-md-arrow-round-up"
                  class="action-icon move"
                  :class="{ disabled: index === 0 }"
                  title="上移"
                  @click.stop="handleMove(index, -1)"
                />
                <AppIcon
                  name="icon-md-arrow-round-down"
                  class="action-icon move"
                  :class="{ disabled: index === engines.length - 1 }"
                  title="下移"
                  @click.stop="handleMove(index, 1)"
                />
                <AppIcon
                  name="icon-bianji"
                  class="action-icon edit"
                  title="编辑"
                  @click.stop="handleEdit(engine, index)"
                />
                <AppIcon
                  name="icon-md-trash"
                  class="action-icon delete"
                  title="删除"
                  @click.stop="handleDelete(index)"
                />
              </div>
            </button>

            <button v-if="showActions" type="button" class="engine-item add-btn" @click="handleAdd">
              <AppIcon name="icon-tianjia" class="action-icon" />
              <span>添加搜索引擎</span>
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { type SearchEngineOption } from './searchUtils'
import {
  advanceBrokenEngineIcon,
  computeEnginePanelPosition,
  getEngineInitial,
  isSuggestionSupported,
  resolveEngineIcon
} from './searchEngineSelectorHelpers'

const props = defineProps<{
  engines: SearchEngineOption[]
  currentEngine: SearchEngineOption | null
  searchMode: 'local' | 'online'
  showActions: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchMode', mode: 'local' | 'online'): void
  (e: 'select', engine: SearchEngineOption): void
  (e: 'add'): void
  (e: 'edit', engine: SearchEngineOption, index: number): void
  (e: 'delete', index: number): void
  (e: 'move', index: number, direction: number): void
  (e: 'menu-open-change', open: boolean): void
}>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const brokenIconIndexes = reactive<Record<string, number>>({})
const PANEL_GAP = 10
const PANEL_WIDTH = 280
const VIEWPORT_MARGIN = 12
const panelPosition = reactive({
  top: 0,
  left: 0,
  width: PANEL_WIDTH,
  maxHeight: 0
})

const isCurrentEngine = (engine: SearchEngineOption) => {
  if (!props.currentEngine) {
    return false
  }

  if (props.currentEngine.id && engine.id) {
    return props.currentEngine.id === engine.id
  }

  return props.currentEngine.name === engine.name && props.currentEngine.url === engine.url
}

// Search engine icons should retry on a fresh mount so transient favicon failures can recover.
const getEngineIcon = (url: string) => resolveEngineIcon(url, brokenIconIndexes)

const markEngineIconBroken = (url: string) => {
  advanceBrokenEngineIcon(url, brokenIconIndexes)
}

const closeMenu = () => {
  menuOpen.value = false
}

const updatePanelPosition = () => {
  const triggerRect = trigger.value?.getBoundingClientRect()

  if (!triggerRect) {
    return
  }

  const next = computeEnginePanelPosition({
    triggerRect,
    panelHeight: panel.value?.offsetHeight || 0,
    engineCount: props.engines.length,
    showActions: props.showActions,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelWidthMax: PANEL_WIDTH,
    viewportMargin: VIEWPORT_MARGIN,
    panelGap: PANEL_GAP
  })

  panelPosition.top = next.top
  panelPosition.left = next.left
  panelPosition.width = next.width
  panelPosition.maxHeight = next.maxHeight
}

const toggleMenu = () => {
  emit('update:searchMode', 'online')
  menuOpen.value = !menuOpen.value
}

const handleSelect = (engine: SearchEngineOption) => {
  emit('select', engine)
  emit('update:searchMode', 'online')
  closeMenu()
}

const handleAdd = () => {
  emit('add')
  closeMenu()
}

const handleEdit = (engine: SearchEngineOption, index: number) => {
  emit('edit', engine, index)
  closeMenu()
}

const handleDelete = (index: number) => {
  emit('delete', index)
  closeMenu()
}

const handleMove = (index: number, direction: number) => {
  emit('move', index, direction)
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  const isInsideTrigger = root.value?.contains(target)
  const isInsidePanel = panel.value?.contains(target)

  if (!isInsideTrigger && !isInsidePanel) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
})

watch(menuOpen, (isOpen) => {
  emit('menu-open-change', isOpen)

  if (isOpen) {
    nextTick(() => {
      updatePanelPosition()
    })
  }
})

const panelStyle = computed(() => ({
  top: `${panelPosition.top}px`,
  left: `${panelPosition.left}px`,
  width: `${panelPosition.width}px`,
  maxHeight: `${panelPosition.maxHeight}px`
}))
</script>

<style scoped lang="scss">
@import './SearchEngineSelector.scss';
</style>
