<template>
  <div class="profile-settings fade-in">
    <div class="settings-card glass-card">
      <div class="user-preview">
        <el-avatar :size="64" class="gradient-bg">{{ form.newUsername?.charAt(0).toUpperCase() }}</el-avatar>
        <div class="preview-info">
          <h3>{{ form.newUsername }}</h3>
          <el-tag :type="getLevelTag(level)">{{ getLevelName(level) }}</el-tag>
        </div>
      </div>

      <el-divider />

      <el-form :model="form" label-position="top" class="glass-form">
        <el-form-item label="用户名">
          <el-input v-model="form.newUsername" placeholder="修改用户名">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
          <div class="form-tip">修改用户名后，所有关联的数据将自动同步。</div>
        </el-form-item>
        
        <el-form-item label="修改密码">
          <el-input v-model="form.newPassword" type="password" placeholder="请输入新密码，不修改请留空" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
          <div class="form-tip">建议使用 8 位以上包含字母与数字的密码。</div>
        </el-form-item>

        <el-form-item class="form-actions">
          <el-button type="primary" :loading="loading" @click="handleUpdate" class="hover-scale submit-btn">
            保存修改
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';

const props = defineProps<{ username: string, level: number }>();
const emit = defineEmits(['update']);

const loading = ref(false);
const form = reactive({
  newUsername: props.username,
  newPassword: ''
});

// 同步 Prop 变更（当保存成功 store 更新时，重置本地表单基础值）
watch(() => props.username, (newVal) => {
  form.newUsername = newVal;
});

const getLevelName = (level: number) => {
  const names = ['游客', '注册用户', 'VIP用户', '管理员'];
  return names[level] || '未知';
};

const getLevelTag = (level: number) => {
  const tags = ['info', '', 'warning', 'danger'];
  return tags[level] || 'info';
};

const handleUpdate = async () => {
  const isUsernameChanged = form.newUsername !== props.username;
  const isPasswordChanged = !!form.newPassword;

  if (!isUsernameChanged && !isPasswordChanged) {
    ElMessage.info('未做任何修改');
    return;
  }

  loading.value = true;
  const updateData: any = {};
  if (isUsernameChanged) updateData.username = form.newUsername;
  if (isPasswordChanged) updateData.password = form.newPassword;

  emit('update', updateData);
  form.newPassword = '';
  loading.value = false;
};
</script>

<style scoped lang="scss">
.profile-settings {
  max-width: 600px;
  margin: 0 auto;

  .settings-card {
    padding: 32px;
    
    .user-preview {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
      
      h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, var(--gray-900), var(--gray-600));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }
  }

  .glass-form {
    .el-form-item {
      margin-bottom: 24px;
      
      :deep(.el-form-item__label) {
        font-weight: 600;
        color: var(--gray-700);
        padding-bottom: 8px;
      }
    }
    
    .form-tip {
      font-size: 12px;
      color: var(--gray-500);
      margin-top: 6px;
      line-height: 1.4;
    }
  }

  .form-actions {
    margin-top: 32px;
    margin-bottom: 0;
    
    .submit-btn {
      width: 100%;
      height: 44px;
      border-radius: 12px;
      font-weight: 600;
      letter-spacing: 1px;
    }
  }
}

:root[theme-mode='dark'] {
  .profile-settings .settings-card .user-preview h3 {
    background: linear-gradient(135deg, #fff, #a3a3a3);
    -webkit-background-clip: text;
    background-clip: text;
  }
}
</style>
