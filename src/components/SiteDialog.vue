<template>
  <el-dialog 
    v-model="visible" 
    :title="form.id && isEdit ? '编辑网站' : '添加网站'"
    width="600px"
    class="mobile-dialog"
    @close="$emit('update:modelValue', false)"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="网站 ID">
        <el-input-number 
          v-model="form.id" 
          :min="1" 
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="网站名称">
        <el-input v-model="form.name" placeholder="请输入网站名称" />
      </el-form-item>
      <el-form-item label="网站地址">
        <el-input v-model="form.url" placeholder="请输入网站地址" />
      </el-form-item>
      <el-form-item label="网站描述">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3"
          placeholder="请输入网站描述" 
        />
      </el-form-item>
      <el-form-item label="所属分类">
        <el-select v-model="form.categoryId" placeholder="请选择分类">
          <el-option 
            v-for="cat in categories" 
            :key="cat.id" 
            :label="cat.name" 
            :value="cat.id" 
          />
        </el-select>
      </el-form-item>
      <el-form-item label="私有书签">
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
import { Item, Category } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  form: Partial<Item>;
  categories: Category[];
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
