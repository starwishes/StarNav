<template>
  <div
    ref="searchContainerRef"
    class="search-container"
    :class="{ 'is-overlay-active': isOverlayActive }"
  >
    <div class="search-stage">
      <div class="search-frame">
        <SearchBox
          ref="searchBoxRef"
          v-model="searchText"
          v-model:search-mode="searchMode"
          :placeholder="placeholder"
          @focus="handleFocus"
          @blur="handleBlur"
          @enter="handleEnter"
          @clear="clearSearch"
        >
          <template #engine-selector>
            <SearchEngineSelector
              v-model:search-mode="searchMode"
              :engines="onlineEngines"
              :current-engine="currentEngine"
              :show-actions="adminStore.isAuthenticated"
              @menu-open-change="handleEngineMenuChange"
              @select="selectEngine"
              @add="openAddDialog"
              @edit="openEditDialog"
              @delete="deleteEngine"
              @move="moveEngine"
            />
          </template>
        </SearchBox>

        <SearchResults
          v-if="isActive && (hasSearched || suggestions.length > 0)"
          v-model:active-suggestion-index="activeSuggestionIndex"
          :search-mode="searchMode"
          :local-results="searchResults"
          :suggestions="suggestions"
          :loading="loading"
          :has-searched="hasSearched"
          :search-text="searchText"
          @item-click="handleItemClick"
          @suggestion-click="handleSuggestionClick"
        />
      </div>
    </div>

    <Teleport to="body">
      <transition name="engine-dialog">
        <div v-if="showDialog" class="engine-dialog-backdrop" @click.self="closeDialog">
          <div
            class="engine-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-engine-dialog-title"
          >
            <div class="engine-dialog__header">
              <div>
                <p class="engine-dialog__eyebrow">Search Engine</p>
                <h3 id="search-engine-dialog-title" class="engine-dialog__title">
                  {{ isEditing ? '编辑搜索引擎' : '添加搜索引擎' }}
                </h3>
              </div>
              <button
                type="button"
                class="engine-dialog__close"
                aria-label="关闭搜索引擎弹窗"
                @click="closeDialog"
              >
                ×
              </button>
            </div>

            <form class="engine-form" @submit.prevent="saveEngine">
              <label class="engine-form__field">
                <span class="engine-form__label">名称</span>
                <input
                  ref="engineNameInputRef"
                  v-model="engineForm.name"
                  class="engine-form__input"
                  placeholder="例如：Google"
                  autocomplete="off"
                />
              </label>

              <label class="engine-form__field">
                <span class="engine-form__label">地址</span>
                <input
                  v-model="engineForm.url"
                  class="engine-form__input"
                  placeholder="例如：https://www.google.com/search?q="
                  autocomplete="off"
                  spellcheck="false"
                />
                <span class="form-tip">
                  URL 需为合法 http/https 搜索地址，并以查询参数赋值结尾，例如
                  https://www.google.com/search?q=；部分引擎如 Brave 仅支持直接搜索，不提供联想词。
                </span>
              </label>

              <div class="engine-dialog__footer">
                <button type="button" class="engine-btn ghost" @click="closeDialog">取消</button>
                <button type="submit" class="engine-btn primary">确定</button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAdminStore } from '@/store/admin'
import SearchBox from './SearchBox.vue'
import SearchEngineSelector from './SearchEngineSelector.vue'
import SearchResults from './SearchResults.vue'
import { useSearchEngineManagement } from './useSearchEngineManagement'
import { useSearchExecution } from './useSearchExecution'

const adminStore = useAdminStore()
const searchContainerRef = ref<HTMLElement | null>(null)
const searchBoxRef = ref<InstanceType<typeof SearchBox> | null>(null)
const engineNameInputRef = ref<HTMLInputElement | null>(null)
const isEngineMenuOpen = ref(false)
const searchMode = ref<'local' | 'online'>('local')
const emit = defineEmits<{
  (e: 'overlay-active-change', active: boolean): void
}>()

const {
  currentEngine,
  onlineEngines,
  showDialog,
  isEditing,
  engineForm,
  closeDialog,
  selectEngine,
  openAddDialog,
  openEditDialog,
  saveEngine,
  deleteEngine,
  moveEngine
} = useSearchEngineManagement(engineNameInputRef)

const {
  searchText,
  searchResults,
  hasSearched,
  loading,
  isActive,
  suggestions,
  activeSuggestionIndex,
  placeholder,
  handleFocus,
  handleBlur,
  handleEnter,
  clearSearch,
  handleItemClick,
  handleSuggestionClick
} = useSearchExecution({
  searchBoxRef,
  searchContainerRef,
  searchMode,
  currentEngine
})

const handleEngineMenuChange = (open: boolean) => {
  isEngineMenuOpen.value = open
}

const isOverlayActive = computed(
  () =>
    isEngineMenuOpen.value ||
    showDialog.value ||
    (isActive.value && (loading.value || hasSearched.value || suggestions.value.length > 0))
)

watch(
  isOverlayActive,
  (active) => {
    emit('overlay-active-change', active)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
@use './Search.scss';
</style>

