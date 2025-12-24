<template>
  <div class="system-settings">
    <el-form :model="settings" label-width="140px" class="glass-form">
      <el-form-item label="开放用户注册">
        <el-switch v-model="settings.registrationEnabled" />
        <div class="form-tip">关闭后，新用户将无法通过注册页面创建账户。</div>
      </el-form-item>
      <el-form-item label="新用户初始等级">
        <el-select v-model="settings.defaultUserLevel">
          <el-option label="注册用户 (1)" :value="1" />
          <el-option label="VIP用户 (2)" :value="2" />
        </el-select>
        <div class="form-tip">新注册账户默认获得的等级。</div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="$emit('save', settings)">保存全局设置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';

const props = defineProps<{ initialSettings: any }>();
defineEmits(['save']);

const settings = reactive({ ...props.initialSettings });

watch(() => props.initialSettings, (val) => {
  Object.assign(settings, val);
}, { deep: true });
</script>

<style scoped lang="scss">
.glass-form {
  padding: 20px;
  border-radius: 12px;
  .form-tip {
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 4px;
    line-height: 1.4;
  }
}
</style>
