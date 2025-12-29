<template>
  <div class="data-manager fade-in">
    <div class="toolbar-card glass-card">
      <el-tabs v-model="internalActiveTab" class="content-tabs">
        <el-tab-pane :label="t('data.categories')" name="categories" />
        <el-tab-pane :label="t('data.sites')" name="items" />
      </el-tabs>
      <div class="global-actions">
        <el-button type="success" :loading="saving" @click="$emit('save')" class="hover-scale">
          <el-icon><Upload /></el-icon> {{ t('manage.saveSync') }}
        </el-button>
        <el-button type="info" @click="handleExport" class="hover-scale">{{ t('manage.exportJson') }}</el-button>
        <el-button type="warning" @click="triggerImport" class="hover-scale">{{ t('manage.importJson') }}</el-button>
        <el-button type="success" @click="$emit('show-bookmark-import')" class="hover-scale">{{ t('manage.importBookmark') }}</el-button>
        <!-- New Clean Duplicates Button -->
        <el-button type="danger" @click="$emit('clean-duplicates')" class="hover-scale">
          <el-icon><Brush /></el-icon> {{ t('manage.cleanDuplicates') }}
        </el-button>
        <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleImport" />
      </div>
    </div>

    <div v-if="internalActiveTab === 'categories'" class="tab-content transition-box">
      <el-card shadow="never" class="glass-card table-wrapper">
        <template #header>
          <div class="card-header">
            <span>{{ t('manage.categoryList') }}</span>
            <el-button type="primary" :icon="Plus" @click="$emit('add-category')">{{ t('manage.addCategory') }}</el-button>
          </div>
        </template>
        <CategoryTable 
          :categories="categories" 
          :items="items" 
          @edit="(cat) => $emit('edit-category', cat)" 
          @delete="(id) => $emit('delete-category', id)" 
          @move="(index, dir) => $emit('move-category', index, dir)"
        />
      </el-card>
    </div>

    <div v-if="internalActiveTab === 'items'" class="tab-content transition-box">
      <el-card shadow="never" class="glass-card table-wrapper">
        <template #header>
          <div class="card-header">
            <span>{{ t('manage.siteList') }}（{{ filteredItems.length }})</span>
            <div class="header-filters">
              <el-input 
                v-model="searchKeyword" 
                :placeholder="t('manage.searchPlaceholder')" 
                clearable 
                style="width: 200px;" 
                @input="updateSearch"
              />
              <el-select 
                v-model="filterCategory" 
                :placeholder="t('manage.allCategories')" 
                clearable 
                style="width: 150px;"
                @change="updateFilter"
              >
                <el-option :label="t('manage.allCategories')" :value="0" />
                <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
              </el-select>
              <el-button type="primary" :icon="Plus" @click="$emit('add-item')">{{ t('manage.addSite') }}</el-button>
            </div>
          </div>
        </template>
        <SiteTable 
          :items="filteredItems" 
          :categories="categories" 
          @edit="(item) => $emit('edit-item', item)" 
          @delete="(id) => $emit('delete-item', id)" 
          @batch-delete="(ids) => $emit('batch-delete', ids)" 
          @batch-move="(ids, categoryId) => $emit('batch-move', ids, categoryId)" 
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Upload, Plus, Brush } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import CategoryTable from '@/components/CategoryTable.vue';
import SiteTable from '@/components/SiteTable.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  activeTab: string;
  saving: boolean;
  categories: any[];
  items: any[];
  filteredItems: any[];
  filterCategory: number;
  searchKeyword: string;
}>();

const emit = defineEmits([
  'update:activeTab', 'update:searchKeyword', 'update:filterCategory',
  'save', 'add-category', 'edit-category', 'delete-category',
  'add-item', 'edit-item', 'delete-item', 'batch-delete', 'batch-move',
  'show-bookmark-import', 'json-import', 'move-category', 'clean-duplicates'
]);

const internalActiveTab = ref(props.activeTab);
const fileInput = ref<HTMLInputElement | null>(null);
const searchKeyword = ref(props.searchKeyword);
const filterCategory = ref(props.filterCategory);

watch(() => props.activeTab, (val) => internalActiveTab.value = val);
watch(internalActiveTab, (val) => emit('update:activeTab', val));

const updateSearch = (val: string) => emit('update:searchKeyword', val);
const updateFilter = (val: number) => emit('update:filterCategory', val);

const handleExport = () => {
  const data = { content: { categories: props.categories, items: props.items } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `starnav-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success(t('manage.exportSuccess'));
};

const triggerImport = () => fileInput.value?.click();

const handleImport = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const json = JSON.parse(event.target?.result as string);
      if (json.content?.categories && json.content?.items) {
        emit('json-import', json.content);
        ElMessage.success(t('manage.importSuccess'));
      }
    } catch (err) { ElMessage.error(t('manage.importFail')); }
    finally { target.value = ''; }
  };
  reader.readAsText(file);
};
</script>

<style scoped lang="scss">
.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  margin-bottom: 20px;
  .global-actions { display: flex; gap: 8px; flex-wrap: wrap; }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .header-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
}

.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
