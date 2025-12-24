<template>
  <div class="site-table-container">
    <el-table 
      :data="items" 
      border 
      stripe 
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column prop="id" label="ID" width="80" align="center" />
      <el-table-column prop="name" label="网站名称" width="150" align="center" />
      <el-table-column prop="url" label="网站地址" min-width="200">
        <template #default="{ row }">
          <el-link :href="row.url" target="_blank" type="primary">{{ row.url }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="所属分类" width="120" align="center">
        <template #default="{ row }">
          <el-tag>{{ getCategoryName(row.categoryId) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="可见性" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.private ? 'danger' : 'success'" effect="plain">
            {{ row.private ? '私有' : '公开' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button 
            type="primary" 
            size="small" 
            :icon="EditIcon"
            @click="$emit('edit', row)"
          >
            编辑
          </el-button>
          <el-button 
            type="danger" 
            size="small" 
            :icon="DeleteIcon"
            @click="$emit('delete', row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Batch Actions Footer -->
    <div v-if="selectedItems.length > 0" class="batch-actions-footer glass-effect">
      <span class="selected-count">已选 {{ selectedItems.length }} 项</span>
      <div class="actions">
        <el-dropdown @command="handleBatchMove">
          <el-button type="primary" size="small">
            批量移动 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-for="cat in categories" 
                :key="cat.id" 
                :command="cat.id"
              >
                {{ cat.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button 
          type="danger" 
          size="small" 
          :icon="DeleteIcon"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
        <el-button size="small" @click="clearSelection">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Edit, Delete, ArrowDown } from '@element-plus/icons-vue';
import { Category, Item } from '@/types';
import { ElMessageBox } from 'element-plus';

const EditIcon = Edit;
const DeleteIcon = Delete;

const props = defineProps<{
  items: Item[];
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: 'edit', item: Item): void;
  (e: 'delete', item: Item): void;
  (e: 'batch-delete', ids: number[]): void;
  (e: 'batch-move', ids: number[], categoryId: number): void;
}>();

const selectedItems = ref<Item[]>([]);

const handleSelectionChange = (val: Item[]) => {
  selectedItems.value = val;
};

const clearSelection = () => {
  selectedItems.value = [];
};

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedItems.value.length} 个网站吗？`, '警告', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    emit('batch-delete', selectedItems.value.map(i => i.id));
    selectedItems.value = [];
  });
};

const handleBatchMove = (categoryId: number) => {
  emit('batch-move', selectedItems.value.map(i => i.id), categoryId);
  selectedItems.value = [];
};

const getCategoryName = (categoryId: number) => {
  return props.categories.find((cat: Category) => cat.id === categoryId)?.name || '未知';
};
</script>

<style scoped lang="scss">
.site-table-container {
  position: relative;
}

.batch-actions-footer {
  position: sticky;
  bottom: 0px;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: 10px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);

  .selected-count {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .actions {
    display: flex;
    gap: 12px;
  }
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}
</style>
