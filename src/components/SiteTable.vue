<template>
  <el-table :data="items" border stripe>
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
</template>

<script setup lang="ts">
import { Edit, Delete } from '@element-plus/icons-vue';
import { Category, Item } from '@/types';

const EditIcon = Edit;
const DeleteIcon = Delete;

const props = defineProps<{
  items: Item[];
  categories: Category[];
}>();

defineEmits<{
  (e: 'edit', item: Item): void;
  (e: 'delete', item: Item): void;
}>();

const getCategoryName = (categoryId: number) => {
  return props.categories.find((cat: Category) => cat.id === categoryId)?.name || '未知';
};
</script>
