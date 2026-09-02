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
          @keydown="handleSearchKeydown"
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
            ref="engineDialogRef"
            class="engine-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-engine-dialog-title"
            tabindex="-1"
          >
            <div class="engine-dialog__header">
              <div>
                <p class="engine-dialog__eyebrow">Search Engine</p>
                <h3 id="search-engine-dialog-title" class="engine-dialog__title">
                  {{ isEditing ? t('engine.dialogTitleEdit') : t('engine.dialogTitleAdd') }}
                </h3>
              </div>
              <button
                type="button"
                class="engine-dialog__close"
                :aria-label="t('engine.closeDialogAria')"
                @click="closeDialog"
              >
                ×
              </button>
            </div>

            <form class="engine-form" @submit.prevent="saveEngine">
              <label class="engine-form__field">
                <span class="engine-form__label">{{ t('engine.nameLabel') }}</span>
                <input
                  ref="engineNameInputRef"
                  v-model="engineForm.name"
                  class="engine-form__input"
                  :placeholder="t('engine.namePlaceholder')"
                  autocomplete="off"
                />
              </label>

              <label class="engine-form__field">
                <span class="engine-form__label">{{ t('engine.urlLabel') }}</span>
                <input
                  v-model="engineForm.url"
                  class="engine-form__input"
                  :placeholder="t('engine.urlPlaceholder')"
                  autocomplete="off"
                  spellcheck="false"
                />
                <span class="form-tip">
                  {{ t('engine.urlTip') }}
                </span>
              </label>

              <div class="engine-dialog__footer">
                <button type="button" class="engine-btn ghost" @click="closeDialog">
                  {{ t('engine.cancel') }}
                </button>
                <button type="submit" class="engine-btn primary">{{ t('engine.confirm') }}</button>
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
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/store/admin'
import { useDialogA11y } from '@/composables/useDialogA11y'
import SearchBox from './SearchBox.vue'
import SearchEngineSelector from './SearchEngineSelector.vue'
import SearchResults from './SearchResults.vue'
import { useSearchEngineManagement } from './useSearchEngineManagement'
import { useSearchExecution } from './useSearchExecution'

const { t } = useI18n()
const adminStore = useAdminStore()
const searchContainerRef = ref<HTMLElement | null>(null)
const searchBoxRef = ref<InstanceType<typeof SearchBox> | null>(null)
const engineNameInputRef = ref<HTMLInputElement | null>(null)
const engineDialogRef = ref<HTMLElement | null>(null)
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

// 打开聚焦、Tab 焦点陷阱、Esc 关闭、关闭后焦点归还触发元素。
useDialogA11y({
  isOpen: showDialog,
  getDialog: () => engineDialogRef.value,
  getInitialFocus: () => engineNameInputRef.value,
  onClose: closeDialog
})

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
  handleSearchKeydown,
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
.search-container {
  position: relative;
  width: 100%;
  z-index: 1;
}

.search-container.is-overlay-active {
  z-index: 1301;
}

.search-stage {
  max-width: 1160px;
  margin: 0 auto;
}

.search-frame {
  position: relative;
  width: min(100%, 820px);
  margin: 0 auto;
  isolation: isolate;
}

.form-tip {
  font-size: 12px;
  color: rgba(29, 29, 31, 0.68);
  line-height: 1.45;
}

.engine-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.46);
  backdrop-filter: blur(18px);
}

.engine-dialog {
  width: min(100%, 440px);
  /* 移动端软键盘/横屏下限制高度，内容可滚动而不被视口裁剪 */
  max-height: min(86vh, 860px);
  overflow-y: auto;
  padding: 28px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  color: #1d1d1f;
}

.engine-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.engine-dialog__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(var(--ui-theme-rgb), 0.88);
}

.engine-dialog__title {
  margin: 0;
  font-family: var(--ui-font-display);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.engine-dialog__close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(29, 29, 31, 0.06);
  color: rgba(29, 29, 31, 0.68);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.12);
    color: var(--ui-theme);
    transform: rotate(90deg);
  }
}

.engine-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.engine-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.engine-form__label {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
}

.engine-form__input {
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid rgba(29, 29, 31, 0.1);
  border-radius: 16px;
  background: #f5f5f7;
  color: #1d1d1f;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &:focus {
    border-color: rgba(var(--ui-theme-rgb), 0.48);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.12);
  }
}

.engine-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.engine-btn {
  min-width: 92px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &.ghost {
    background: #fff;
    border-color: rgba(29, 29, 31, 0.12);
    color: #1d1d1f;
  }

  &.primary {
    background: var(--ui-theme);
    color: #fff;
    box-shadow: 0 12px 24px rgba(var(--ui-theme-rgb), 0.2);
  }
}

:global(:root[data-theme-preset='cinema'] .engine-dialog) {
  background: rgba(24, 24, 27, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
  color: #f5f5f7;
}

:global(:root[data-theme-preset='cinema'] .engine-dialog__close) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.68);
}

:global(:root[data-theme-preset='cinema'] .engine-form__label),
:global(:root[data-theme-preset='cinema'] .engine-dialog__title),
:global(:root[data-theme-preset='cinema'] .form-tip) {
  color: #f5f5f7;
}

:global(:root[data-theme-preset='cinema'] .engine-form__input) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f5f5f7;
}

:global(:root[theme-mode='dark'] .form-tip),
:global(:root[theme-mode='dark'] .engine-form__label) {
  color: rgba(226, 232, 240, 0.72);
}

:global(:root[theme-mode='dark'] .engine-dialog) {
  background: color-mix(
    in srgb,
    var(--ui-panel-surface, rgba(15, 23, 42, 0.96)) 92%,
    rgba(var(--ui-theme-rgb), 0.08) 8%
  );
  border-color: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: var(--ui-text-primary, #f8fafc);
}

:global(:root[theme-mode='dark'] .engine-dialog__close) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(226, 232, 240, 0.68);
}

:global(:root[theme-mode='dark'] .engine-dialog__title) {
  color: var(--ui-text-primary, #f8fafc);
}

:global(:root[theme-mode='dark'] .engine-form__input) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--ui-text-primary, #f8fafc);

  &:focus {
    background: rgba(255, 255, 255, 0.1);
  }
}

:global(:root[theme-mode='dark'] .engine-btn.ghost) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--ui-text-primary, #f8fafc);
}
</style>
