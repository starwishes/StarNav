<template>
  <el-dialog 
    v-model="visible" 
    :title="form.id && isEdit ? '编辑分类' : '添加分类'"
    width="500px"
    class="mobile-dialog"
    @close="$emit('update:modelValue', false)"
  >
    <el-form :model="form" label-width="80px">
      <el-form-item label="分类 ID">
        <el-input-number 
          v-model="form.id" 
          :min="1" 
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="分类名称">
        <el-input v-model="form.name" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="隐藏分类">
        <el-switch v-model="form.private" active-text="仅登录可见" inactive-text="公开" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="$emit('save')">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Category } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  form: Partial<Category>;
  isEdit: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});
</script>
