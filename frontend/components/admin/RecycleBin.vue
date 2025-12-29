<template>
  <div class="recycle-bin">
    <div class="header">
      <h3>{{ t('recycle.title') }}</h3>
      <div class="actions">
        <el-button type="primary" :loading="loading" @click="loadTrash">
          <el-icon><Refresh /></el-icon> {{ t('common.refresh') }}
        </el-button>
        <el-button type="danger" :disabled="items.length === 0" @click="handleEmptyTrash">
          <el-icon><Delete /></el-icon> {{ t('recycle.emptyTrash') }}
        </el-button>
      </div>
    </div>

    <el-empty v-if="!loading && items.length === 0" :description="t('recycle.empty')" />

    <el-table v-else :data="items" border stripe v-loading="loading">
      <el-table-column prop="name" :label="t('table.name')" min-width="150" show-overflow-tooltip />
      <el-table-column prop="url" :label="t('table.siteUrl')" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link :href="row.url" target="_blank" type="primary">{{ row.url }}</el-link>
        </template>
      </el-table-column>
      <el-table-column :label="t('recycle.deletedAt')" width="180">
        <template #default="{ row }">
          {{ formatDate(row.deletedAt) }}
        </template>
      </el-table-column>
      <el-table-column :label="t('table.action')" width="200" align="center">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="handleRestore(row)">
            <el-icon><RefreshLeft /></el-icon> {{ t('recycle.restore') }}
          </el-button>
          <el-button type="danger" size="small" @click="handlePermanentDelete(row)">
            <el-icon><Delete /></el-icon> {{ t('common.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, RefreshLeft, Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAdminStore } from '@/store/admin';

const { t } = useI18n();
const adminStore = useAdminStore();

const items = ref<any[]>([]);
const loading = ref(false);

const loadTrash = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/recycle', {
      headers: { 'Authorization': `Bearer ${adminStore.token}` }
    });
    const data = await res.json();
    items.value = data.data?.items || [];
  } catch (e) {
    ElMessage.error(t('common.loadFailed'));
  } finally {
    loading.value = false;
  }
};

const handleRestore = async (row: any) => {
  try {
    const res = await fetch(`/api/recycle/${row.id}/restore`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminStore.token}` }
    });
    if (res.ok) {
      ElMessage.success(t('recycle.restoreSuccess'));
      loadTrash();
    } else {
      ElMessage.error(t('common.operationFailed'));
    }
  } catch (e) {
    ElMessage.error(t('common.operationFailed'));
  }
};

const handlePermanentDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(t('recycle.permanentDeleteConfirm'), t('common.warning'), { type: 'warning' });
    const res = await fetch(`/api/recycle/${row.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminStore.token}` }
    });
    if (res.ok) {
      ElMessage.success(t('common.deleteSuccess'));
      loadTrash();
    }
  } catch (e) { /* cancelled */ }
};

const handleEmptyTrash = async () => {
  try {
    await ElMessageBox.confirm(t('recycle.emptyConfirm'), t('common.warning'), { type: 'warning' });
    const res = await fetch('/api/recycle', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminStore.token}` }
    });
    if (res.ok) {
      ElMessage.success(t('recycle.emptySuccess'));
      items.value = [];
    }
  } catch (e) { /* cancelled */ }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};

onMounted(() => loadTrash());
</script>

<style scoped lang="scss">
.recycle-bin {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .actions {
      display: flex;
      gap: 10px;
    }
  }
}
</style>
