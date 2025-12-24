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
        <el-switch 
          v-model="form.private" 
          active-text="仅登录可见" 
          inactive-text="公开" 
        />
      </el-form-item>

      <el-form-item label="访问权限">
        <el-select v-model="form.level" placeholder="请选择最小可见等级">
          <el-option label="游客 (公开)" :value="0" />
          <el-option label="注册用户" :value="1" />
          <el-option label="VIP用户" :value="2" />
          <el-option label="管理员" :value="3" />
        </el-select>
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入标签，按回车添加"
          style="width: 100%"
        >
          <el-option
            v-for="tag in availableTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
        <div style="margin-top: 5px; font-size: 12px; color: #909399;">
          提示：输入后按回车添加新标签
        </div>
      </el-form-item>

      <el-form-item label="置顶显示">
        <el-switch 
          v-model="form.pinned" 
          active-text="置顶" 
          inactive-text="默认" 
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="$emit('save')">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
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

// 从所有书签中提取可用标签
const availableTags = computed(() => {
  const tags = new Set<string>();
  if (props.form.tags) {
    props.form.tags.forEach(tag => tags.add(tag));
  }
  return Array.from(tags);
});

// 确保 tags 字段初始化
watch(() => props.form, (newForm) => {
  if (newForm && !newForm.tags) {
    newForm.tags = [];
  }
}, { immediate: true });
</script>