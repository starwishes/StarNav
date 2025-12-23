<template>
  <el-table :data="categories" border stripe>
    <el-table-column prop="id" label="ID" width="80" align="center" />
    <el-table-column prop="name" label="分类名称" align="center" />
    <el-table-column label="可见性" width="100" align="center">
      <template #default="{ row }">
        <el-tag :type="row.private ? 'danger' : 'success'" effect="plain">
          {{ row.private ? '私有' : '公开' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="网站数量" width="120" align="center">
      <template #default="{ row }">
        <el-tag size="small">{{ getItemCount(row.id) }}</el-tag>
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
</template>

<script setup lang="ts">
import { Edit, Delete } from '@element-plus/icons-vue';
import { Category, Item } from '@/types';

const EditIcon = Edit;
const DeleteIcon = Delete;

const props = defineProps<{
  categories: Category[];
  items: Item[];
}>();

const emit = defineEmits<{
  (e: 'edit', category: Category): void;
  (e: 'delete', category: Category): void;
}>();

const getItemCount = (categoryId: number) => {
  return props.items.filter(item => item.categoryId === categoryId).length;
};
</script>
