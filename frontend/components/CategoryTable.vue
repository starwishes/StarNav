<template>
  <el-table :data="categories" border stripe>
    <el-table-column v-if="!isMobile" type="index" width="50" align="center" />
    <el-table-column v-if="!isMobile" prop="id" :label="t('table.id')" width="80" align="center" />
    <el-table-column prop="name" :label="t('table.name')" align="center" />
    <el-table-column v-if="!isMobile" :label="t('table.visibility')" width="120" align="center">
      <template #default="{ row }">
        <el-tag :type="row.level === 0 ? 'success' : (row.level === 3 ? 'danger' : 'warning')" effect="plain">
          {{ row.level === 1 ? t('userLevel.user') : (row.level === 2 ? t('userLevel.vip') : (row.level === 3 ? t('userLevel.admin') : t('userLevel.guest'))) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column v-if="!isMobile" :label="t('table.siteCount')" width="120" align="center">
      <template #default="{ row }">
        <el-tag size="small">{{ getItemCount(row.id) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="t('table.action')" width="280" align="center" fixed="right">
      <template #default="{ row, $index: index }">
        <el-button 
          type="primary" 
          size="small" 
          :icon="EditIcon"
          @click="$emit('edit', row)"
        >
          {{ t('table.edit') }}
        </el-button>
        <el-button 
          type="info" 
          size="small" 
          plain
          :disabled="index === 0"
          @click="$emit('move', index, 'up')"
        >
           <el-icon><CaretTop /></el-icon>
        </el-button>
        <el-button 
          type="info" 
          size="small" 
          plain
          :disabled="index === categories.length - 1"
          @click="$emit('move', index, 'down')"
        >
           <el-icon><CaretBottom /></el-icon>
        </el-button>
        <el-button 
          type="danger" 
          size="small" 
          :icon="DeleteIcon"
          @click="$emit('delete', row)"
        >
          {{ t('table.delete') }}
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { Edit, Delete, CaretTop, CaretBottom } from '@element-plus/icons-vue';
import { Category, Item } from '@/types';
import { useI18n } from 'vue-i18n';
import { useMobile } from '@/composables/useMobile';

const { t } = useI18n();
const { isMobile } = useMobile();

const EditIcon = Edit;
const DeleteIcon = Delete;

const props = defineProps<{
  categories: Category[];
  items: Item[];
}>();

const emit = defineEmits<{
  (e: 'move', index: number, direction: 'up' | 'down'): void;
  (e: 'edit', category: Category): void;
  (e: 'delete', category: Category): void;
}>();

const getItemCount = (categoryId: number) => {
  return props.items.filter(item => item.categoryId === categoryId).length;
};
</script>
