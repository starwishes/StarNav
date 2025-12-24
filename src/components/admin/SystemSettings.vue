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

      <el-divider>背景图设置</el-divider>

      <el-form-item label="背景图 URL">
        <el-input 
          v-model="backgroundUrl" 
          placeholder="输入图片 URL，留空使用默认背景"
          clearable
        />
        <div class="form-tip">支持 https:// 开头的图片链接</div>
      </el-form-item>

      <el-form-item label="或上传图片">
        <el-upload
          ref="uploadRef"
          action=""
          :auto-upload="false"
          :show-file-list="false"
          accept="image/*"
          :on-change="handleFileChange"
        >
          <el-button type="success" :loading="uploading">选择图片上传</el-button>
        </el-upload>
        <div class="form-tip">支持 JPG/PNG/GIF，最大 5MB</div>
      </el-form-item>

      <el-form-item v-if="previewUrl" label="预览">
        <div class="bg-preview" :style="{ backgroundImage: `url(${previewUrl})` }"></div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="saveSettings">保存全局设置</el-button>
        <el-button @click="clearBackground">清除背景</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useAdminStore } from '@/store/admin';

const props = defineProps<{ initialSettings: any }>();
const emit = defineEmits(['save']);

const adminStore = useAdminStore();
const settings = reactive({ ...props.initialSettings });
const backgroundUrl = ref('');
const uploading = ref(false);

watch(() => props.initialSettings, (val) => {
  Object.assign(settings, val);
  backgroundUrl.value = val.backgroundUrl || '';
}, { deep: true, immediate: true });

const previewUrl = computed(() => backgroundUrl.value || '');

const handleFileChange = async (file: any) => {
  if (!file.raw) return;
  
  uploading.value = true;
  try {
    // 转换为 base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        
        const response = await fetch('/api/upload-background', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminStore.token}`
          },
          body: JSON.stringify({ data: base64Data, filename: file.raw.name })
        });
        
        const data = await response.json();
        if (data.success) {
          backgroundUrl.value = data.url;
          ElMessage.success('背景图上传成功！');
        } else {
          ElMessage.error(data.error || '上传失败');
        }
      } catch (err) {
        ElMessage.error('上传失败');
      } finally {
        uploading.value = false;
      }
    };
    reader.readAsDataURL(file.raw);
  } catch (err) {
    ElMessage.error('上传失败');
    uploading.value = false;
  }
};

const saveSettings = async () => {
  // 先保存背景 URL
  if (backgroundUrl.value !== (props.initialSettings.backgroundUrl || '')) {
    await fetch('/api/set-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminStore.token}`
      },
      body: JSON.stringify({ url: backgroundUrl.value })
    });
  }
  
  emit('save', settings);
};

const clearBackground = async () => {
  backgroundUrl.value = '';
  await fetch('/api/set-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminStore.token}`
    },
    body: JSON.stringify({ url: '' })
  });
  ElMessage.success('背景已清除，将使用默认背景');
};
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

.bg-preview {
  width: 200px;
  height: 120px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--gray-200);
}
</style>
