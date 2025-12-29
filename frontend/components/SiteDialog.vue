<template>
  <el-dialog 
    v-model="visible" 
    :title="isEdit ? t('site.edit') : t('site.add')"
    width="600px"
    class="mobile-dialog"
    @close="handleClose"
  >
    <el-form v-if="localForm" :model="localForm" label-width="100px">
      <el-form-item :label="t('site.id')">
        <el-input-number 
          v-model="localForm.id" 
          :min="1" 
          :disabled="isEdit"
        />
      </el-form-item>

      <el-form-item :label="t('site.name')">
        <el-input v-model="localForm.name" :placeholder="t('site.placeholderName')" />
      </el-form-item>

      <el-form-item :label="t('site.url')">
        <el-input v-model="localForm.url" :placeholder="t('site.placeholderUrl')" />
      </el-form-item>

      <el-form-item :label="t('site.description')">
        <el-input 
          v-model="localForm.description" 
          type="textarea" 
          :rows="3"
          :placeholder="t('site.placeholderDesc')" 
        />
      </el-form-item>

      <el-form-item :label="t('site.category')">
        <el-select v-model="localForm.categoryId" :placeholder="t('site.placeholderCategory')">
          <el-option 
            v-for="cat in categories" 
            :key="cat.id" 
            :label="cat.name" 
            :value="cat.id" 
          />
        </el-select>
      </el-form-item>

       <el-form-item :label="t('site.permission')">
         <el-select v-model="localForm.level" :placeholder="t('category.permissionPlaceholder')">
           <el-option :label="t('userLevel.guest') + ' (' + t('category.public') + ')'" :value="USER_LEVEL.GUEST" />
           <el-option :label="t('userLevel.user')" :value="USER_LEVEL.USER" />
           <el-option :label="t('userLevel.vip')" :value="USER_LEVEL.VIP" />
           <el-option :label="t('userLevel.admin')" :value="USER_LEVEL.ADMIN" />
         </el-select>
      </el-form-item>

      <el-form-item :label="t('site.tags')">
        <el-select
          v-model="localForm.tags"
          multiple
          filterable
          allow-create
          default-first-option
          :placeholder="t('site.placeholderTags')"
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
          {{ t('site.tagsTip') }}
        </div>
      </el-form-item>

      <el-form-item :label="t('site.pinned')">
        <el-switch 
          v-model="localForm.pinned" 
          :active-text="t('site.pinnedText')" 
          :inactive-text="t('site.defaultText')" 
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Item, Category } from '@/types';
import { useI18n } from 'vue-i18n';
import { useDataStore } from '@/store/data';
// @ts-ignore
import { normalizeUrl } from '@common/url';
// @ts-ignore
import { USER_LEVEL } from '@common/constants';

const { t } = useI18n();
const dataStore = useDataStore();

const props = defineProps<{
  modelValue: boolean;
  form: Partial<Item>;
  categories: Category[];
  isEdit: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:form', value: Partial<Item>): void;
  (e: 'save', value: Partial<Item>): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

// 本地状态，避免直接修改 props
const localForm = ref<Partial<Item>>({});

// 当弹窗打开或 props.form 变化时，拷贝数据
watch(() => props.modelValue, (val) => {
  if (val) {
    localForm.value = JSON.parse(JSON.stringify(toRaw(props.form || {})));
    if (!localForm.value.tags) localForm.value.tags = [];
  }
}, { immediate: true });

// 提取可用标签
const availableTags = computed(() => {
  const tags = new Set<string>();
  if (localForm.value && localForm.value.tags) {
    localForm.value.tags.forEach(tag => tags.add(tag));
  }
  return Array.from(tags);
});

const handleClose = () => {
  visible.value = false;
};

const handleSave = () => {
  if (!localForm.value.name || !localForm.value.url) {
    ElMessage.warning(t('common.tips'));
    return;
  }
  
  // 1. 前端强制校验 & 实时清洗
  const cleanedUrl = normalizeUrl(localForm.value.url);
  
  // 拦截一：清洗后为空 (无效链接)
  if (!cleanedUrl) {
    ElMessage.error('URL 无效或包含非法字符，请检查');
    return;
  }
  
  // 自动回填清洗后的 URL (去除 utm_, 尾部斜杠等)
  localForm.value.url = cleanedUrl;
  
  // 2. 书签去重检查
  const duplicate = dataStore.findDuplicateItem(localForm.value.url!, props.isEdit ? localForm.value.id : undefined);
  if (duplicate) {
    const category = props.categories.find(c => c.id === duplicate.categoryId);
    const categoryName = category ? category.name : '未知分类';
    
    ElMessageBox.alert(
      `书签已存在: "${duplicate.name}" (所属分类: ${categoryName})`,
      '添加失败',
      {
        confirmButtonText: t('common.confirm'),
        type: 'error'
      }
    );
    return; // 强制拦截，不能继续下一步
  }
  

  // 先同步 v-model，再发出 save 信号并传参
  const finalData = JSON.parse(JSON.stringify(toRaw(localForm.value)));
  emit('update:form', finalData);
  emit('save', finalData);
};
</script>