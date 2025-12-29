<template>
  <el-dialog 
    v-model="visible" 
    :title="isEdit ? t('category.editCategory') : t('category.addCategory')"
    width="500px"
    class="mobile-dialog"
    @close="handleClose"
  >
    <el-form v-if="localForm" :model="localForm" label-width="100px">
      <el-form-item :label="t('category.id')">
        <el-input-number 
          v-model="localForm.id" 
          :min="1" 
          :disabled="isEdit"
        />
      </el-form-item>

      <el-form-item :label="t('category.name')">
        <el-input v-model="localForm.name" :placeholder="t('category.placeholderName')" />
      </el-form-item>

      <el-form-item :label="t('category.permission')">
         <el-select v-model="localForm.level" :placeholder="t('category.permissionPlaceholder')">
           <el-option :label="t('userLevel.guest') + ' (' + t('category.public') + ')'" :value="0" />
           <el-option :label="t('userLevel.user')" :value="1" />
           <el-option :label="t('userLevel.vip')" :value="2" />
           <el-option :label="t('userLevel.admin')" :value="3" />
         </el-select>
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
import { Category } from '@/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  form: Partial<Category>;
  isEdit: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:form', value: Partial<Category>): void;
  (e: 'save'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const localForm = ref<Partial<Category>>({});

watch(() => props.modelValue, (val) => {
  if (val) {
    localForm.value = JSON.parse(JSON.stringify(toRaw(props.form || {})));
  }
}, { immediate: true });

const handleClose = () => {
  visible.value = false;
};

const handleSave = () => {
  emit('update:form', localForm.value);
  emit('save');
};
</script>
