<template>
  <div class="data-manager fade-in">
    <div class="toolbar-card">
      <div class="content-tabs" role="tablist" aria-label="数据管理标签页">
        <button
          type="button"
          class="tab-button"
          :class="{ active: internalActiveTab === 'categories' }"
          :aria-pressed="internalActiveTab === 'categories'"
          @click="internalActiveTab = 'categories'"
        >
          {{ t('data.categories') }}
        </button>
        <button
          type="button"
          class="tab-button"
          :class="{ active: internalActiveTab === 'items' }"
          :aria-pressed="internalActiveTab === 'items'"
          @click="internalActiveTab = 'items'"
        >
          {{ t('data.sites') }}
        </button>
      </div>
      <div class="global-actions">
        <button type="button" class="action-button info" @click="handleExport">
          {{ t('manage.exportJson') }}
        </button>
        <button type="button" class="action-button warning" @click="triggerImport">
          {{ t('manage.importJson') }}
        </button>
        <button type="button" class="action-button success" @click="$emit('show-bookmark-import')">
          {{ t('manage.importBookmark') }}
        </button>
        <button type="button" class="action-button danger" @click="$emit('clean-duplicates')">
          {{ t('manage.cleanDuplicates') }}
        </button>
        <input
          type="file"
          ref="fileInput"
          class="sr-only-input"
          accept=".json"
          @change="handleImport"
        />
      </div>
    </div>

    <div v-if="internalActiveTab === 'categories'" class="tab-content transition-box">
      <section class="panel-card table-wrapper">
        <div class="card-header">
          <span class="card-title">{{ t('manage.categoryList') }}</span>
          <button type="button" class="action-button primary" @click="$emit('add-category')">
            {{ t('manage.addCategory') }}
          </button>
        </div>
        <CategoryTable
          :categories="categories"
          :items="items"
          @edit="(cat) => $emit('edit-category', cat)"
          @delete="(id) => $emit('delete-category', id)"
          @move="(index, dir) => $emit('move-category', index, dir)"
        />
      </section>
    </div>

    <div v-if="internalActiveTab === 'items'" class="tab-content transition-box">
      <section class="panel-card table-wrapper">
        <div class="card-header">
          <span class="card-title">{{ t('manage.siteList') }}（{{ filteredItems.length }})</span>
          <div class="header-filters">
            <label class="search-field">
              <input
                v-model="searchKeyword"
                class="filter-input"
                type="search"
                :placeholder="t('manage.searchPlaceholder')"
              />
              <button
                v-if="searchKeyword"
                type="button"
                class="clear-button"
                aria-label="清空搜索"
                @click="searchKeyword = ''"
              >
                ×
              </button>
            </label>
            <AppSelect v-model.number="filterCategory" class="filter-select sn-inline-select">
              <option :value="0">{{ t('manage.allCategories') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </AppSelect>
            <button type="button" class="action-button primary" @click="$emit('add-item')">
              {{ t('manage.addSite') }}
            </button>
          </div>
        </div>
        <SiteTable
          :items="filteredItems"
          :categories="categories"
          @edit="(item) => $emit('edit-item', item)"
          @delete="(id) => $emit('delete-item', id)"
          @batch-delete="(ids) => $emit('batch-delete', ids)"
          @batch-move="(ids, categoryId) => $emit('batch-move', ids, categoryId)"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from '@/utils/feedback'
import AppSelect from '@/components/AppSelect.vue'
import CategoryTable from '@/components/CategoryTable.vue'
import SiteTable from '@/components/SiteTable.vue'
import { useI18n } from 'vue-i18n'
import { buildJsonBackupPayload, parseJsonBackupPayload } from '@/utils/jsonBackup'
import type { Category, Item } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  activeTab: string
  categories: Category[]
  items: Item[]
  filteredItems: Item[]
  filterCategory: number
  searchKeyword: string
}>()

const emit = defineEmits([
  'update:activeTab',
  'update:searchKeyword',
  'update:filterCategory',
  'add-category',
  'edit-category',
  'delete-category',
  'add-item',
  'edit-item',
  'delete-item',
  'batch-delete',
  'batch-move',
  'show-bookmark-import',
  'json-import',
  'move-category',
  'clean-duplicates'
])

const fileInput = ref<HTMLInputElement | null>(null)
const internalActiveTab = computed({
  get: () => props.activeTab,
  set: (value: string) => emit('update:activeTab', value)
})
const searchKeyword = computed({
  get: () => props.searchKeyword,
  set: (value: string) => emit('update:searchKeyword', value)
})
const filterCategory = computed({
  get: () => props.filterCategory,
  set: (value: number) => emit('update:filterCategory', value)
})

const handleExport = () => {
  const data = buildJsonBackupPayload({ categories: props.categories, items: props.items })
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `starnav-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(t('manage.exportSuccess'))
}

const triggerImport = () => fileInput.value?.click()

const handleImport = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target?.result as string)
      const backup = parseJsonBackupPayload(json)
      if (backup) {
        emit('json-import', backup)
      } else {
        ElMessage.error(t('manage.importFail'))
      }
    } catch {
      ElMessage.error(t('manage.importFail'))
    } finally {
      target.value = ''
    }
  }
  reader.readAsText(file)
}
</script>

<style scoped lang="scss">
.data-manager {
  --data-card-bg: var(--ui-panel-bg, rgba(255, 255, 255, 0.9));
  --data-card-border: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  --data-tabs-bg: rgba(148, 163, 184, 0.12);
  --data-input-bg: var(--ui-panel-surface, rgba(255, 255, 255, 0.92));
  --data-input-border: rgba(148, 163, 184, 0.24);
  --data-input-focus-bg: rgba(255, 255, 255, 0.98);
  --data-input-placeholder: rgba(100, 116, 139, 0.78);
  --data-clear-bg: rgba(148, 163, 184, 0.14);
  --data-action-bg: rgba(148, 163, 184, 0.12);
  --data-action-text: var(--gray-700);
  --data-action-info-bg: rgba(59, 130, 246, 0.12);
  --data-action-info-border: rgba(59, 130, 246, 0.2);
  --data-action-info-text: #1d4ed8;
  --data-action-warning-bg: rgba(245, 158, 11, 0.14);
  --data-action-warning-border: rgba(245, 158, 11, 0.2);
  --data-action-warning-text: #b45309;
  --data-action-success-bg: rgba(34, 197, 94, 0.14);
  --data-action-success-border: rgba(34, 197, 94, 0.2);
  --data-action-success-text: #15803d;
  --data-action-danger-bg: rgba(239, 68, 68, 0.12);
  --data-action-danger-border: rgba(239, 68, 68, 0.2);
  --data-action-danger-text: #b91c1c;
  color: var(--ui-text-primary, #0f172a);
  display: flex;
  flex-direction: column;
  gap: 20px;
  // Respond to the admin content pane width (not full browser chrome + sidebar)
  container-type: inline-size;
  container-name: data-manager;
}

:global(:root[theme-mode='dark'] .data-manager) {
  --data-card-bg: rgba(15, 23, 42, 0.84);
  --data-card-border: rgba(148, 163, 184, 0.2);
  --data-tabs-bg: rgba(51, 65, 85, 0.72);
  --data-input-bg: rgba(15, 23, 42, 0.88);
  --data-input-border: rgba(148, 163, 184, 0.24);
  --data-input-focus-bg: rgba(15, 23, 42, 0.96);
  --data-input-placeholder: rgba(203, 213, 225, 0.56);
  --data-clear-bg: rgba(51, 65, 85, 0.82);
  --data-action-bg: rgba(51, 65, 85, 0.78);
  --data-action-text: rgba(226, 232, 240, 0.88);
  --data-action-info-bg: rgba(59, 130, 246, 0.18);
  --data-action-info-border: rgba(96, 165, 250, 0.2);
  --data-action-info-text: #93c5fd;
  --data-action-warning-bg: rgba(245, 158, 11, 0.2);
  --data-action-warning-border: rgba(251, 191, 36, 0.22);
  --data-action-warning-text: #fcd34d;
  --data-action-success-bg: rgba(34, 197, 94, 0.2);
  --data-action-success-border: rgba(74, 222, 128, 0.22);
  --data-action-success-text: #86efac;
  --data-action-danger-bg: rgba(239, 68, 68, 0.18);
  --data-action-danger-border: rgba(248, 113, 113, 0.22);
  --data-action-danger-text: #fca5a5;
  color-scheme: dark;
}

.toolbar-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--data-card-border);
  background: var(--data-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.content-tabs {
  display: inline-flex;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  width: max-content;
  max-width: 100%;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--data-tabs-bg);
}

.tab-button {
  min-width: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--gray-600);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    color: var(--gray-800);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.25);
    outline-offset: 2px;
  }

  &.active {
    background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
    color: #fff;
    box-shadow: 0 10px 20px rgba(var(--ui-theme-rgb), 0.24);
  }
}

.global-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.panel-card {
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--data-card-border);
  background: var(--data-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 18px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  color: var(--gray-800);
  font-size: 16px;
  font-weight: 700;
  flex: 0 1 auto;
}

.card-header > .action-button {
  flex: 0 0 auto;
  width: auto;
  margin-left: auto;
}

.header-filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
}

.header-filters .action-button {
  flex: 0 0 auto;
  width: auto;
}

.search-field {
  position: relative;
  min-width: 180px;
  flex: 1 1 180px;
}

.filter-input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--data-input-border);
  border-radius: 12px;
  background: var(--data-input-bg);
  color: var(--ui-text-primary, var(--gray-700));
  padding: 9px 38px 9px 14px;
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;

  &::placeholder {
    color: var(--data-input-placeholder);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--ui-theme-rgb), 0.42);
    box-shadow: 0 0 0 4px rgba(var(--ui-theme-rgb), 0.1);
    background: var(--data-input-focus-bg);
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--ui-text-primary, var(--gray-700));
    -webkit-box-shadow: 0 0 0 1000px var(--data-input-focus-bg) inset;
    transition: background-color 9999s ease-in-out 0s;
  }
}

.clear-button {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--data-clear-bg);
  color: var(--gray-500);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: rgba(var(--ui-theme-rgb), 0.14);
    color: rgb(var(--ui-theme-rgb));
  }
}

.filter-select {
  min-width: 160px;
}

.action-button {
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--data-action-bg);
  color: var(--data-action-text);
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  flex: 0 0 auto;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--ui-theme-rgb), 0.25);
    outline-offset: 2px;
  }
}

.action-button.primary {
  background: linear-gradient(135deg, rgb(var(--ui-theme-rgb)), rgba(var(--ui-theme-rgb), 0.82));
  color: #fff;
}

.action-button.info {
  background: var(--data-action-info-bg);
  border-color: var(--data-action-info-border);
  color: var(--data-action-info-text);
}

.action-button.warning {
  background: var(--data-action-warning-bg);
  border-color: var(--data-action-warning-border);
  color: var(--data-action-warning-text);
}

.action-button.success {
  background: var(--data-action-success-bg);
  border-color: var(--data-action-success-border);
  color: var(--data-action-success-text);
}

.action-button.danger {
  background: var(--data-action-danger-bg);
  border-color: var(--data-action-danger-border);
  color: var(--data-action-danger-text);
}

.sr-only-input {
  display: none;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ---- Content-width breakpoints (sidebar-aware) ----

// Compact content pane: stack toolbar, keep list add-buttons compact
@container data-manager (max-width: 860px) {
  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }

  .global-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .content-tabs {
    width: max-content;
    max-width: 100%;
  }

  .global-actions .action-button {
    flex: 1 1 140px;
    min-height: 42px;
  }

  .header-filters {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
  }

  .search-field,
  .filter-select {
    flex: 1 1 160px;
    min-width: 0;
  }

  // Never stretch primary add actions into a full-width slab
  .card-header > .action-button,
  .header-filters .action-button {
    flex: 0 0 auto;
    width: auto;
    min-height: 40px;
    margin-left: auto;
  }
}

// Phone-narrow content: wrap more tightly, still keep add button pill-sized
@container data-manager (max-width: 520px) {
  .content-tabs {
    width: max-content;
  }

  .tab-button {
    min-width: 0;
    flex: 0 0 auto;
    padding: 7px 12px;
  }

  .global-actions .action-button {
    flex: 1 1 calc(50% - 10px);
  }

  .card-header {
    gap: 10px;
  }

  .header-filters {
    gap: 8px;
  }

  .search-field,
  .filter-select {
    flex: 1 1 100%;
  }

  .card-header > .action-button,
  .header-filters .action-button {
    margin-left: auto;
    width: auto;
    max-width: 100%;
  }
}

// Fallback when container queries unsupported: viewport media
@supports not (container-type: inline-size) {
  @media (max-width: 1100px) {
    .toolbar-card {
      flex-direction: column;
      align-items: stretch;
    }

    .global-actions {
      width: 100%;
    }

    .content-tabs {
      width: max-content;
      max-width: 100%;
    }

    .global-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .global-actions .action-button {
      flex: 1 1 140px;
    }

    .header-filters {
      width: 100%;
      margin-left: 0;
    }

    .card-header > .action-button,
    .header-filters .action-button {
      flex: 0 0 auto;
      width: auto;
      margin-left: auto;
    }
  }
}
</style>
