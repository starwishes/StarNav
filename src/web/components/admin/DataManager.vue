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
@import './DataManager.scss';
</style>
