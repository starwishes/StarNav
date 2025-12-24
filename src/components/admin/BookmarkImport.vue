<template>
  <el-dialog
    v-model="visible"
    title="导入浏览器书签"
    width="700px"
    class="mobile-dialog"
    @close="handleClose"
  >
    <!-- 步骤 1: 选择文件 -->
    <div v-if="step === 1" class="import-step">
      <el-upload
        ref="uploadRef"
        drag
        accept=".html,.htm"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击选择</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 Chrome、Firefox、Edge 导出的 HTML 书签文件
          </div>
        </template>
      </el-upload>

      <div class="import-help">
        <h4>如何导出书签？</h4>
        <ul>
          <li><strong>Chrome:</strong> 书签管理器 → 右上角菜单 → 导出书签</li>
          <li><strong>Firefox:</strong> 书签 → 管理书签 → 导入和备份 → 导出书签到 HTML</li>
          <li><strong>Edge:</strong> 书签 → 管理书签 → 右上角菜单 → 导出书签</li>
        </ul>
      </div>
    </div>

    <!-- 步骤 2: 预览 -->
    <div v-else-if="step === 2" class="import-step">
      <div class="preview-header">
        <el-tag type="success">已解析</el-tag>
        <span>{{ parsedCategories.length }} 个分类，{{ totalBookmarks }} 个书签</span>
      </div>
      
      <div class="preview-list">
        <div v-for="cat in parsedCategories" :key="cat.name" class="preview-category">
          <div class="category-header">
            <el-checkbox v-model="cat.selected">
              <strong>{{ cat.name }}</strong>
              <el-tag size="small" type="info">{{ cat.items.length }} 个书签</el-tag>
            </el-checkbox>
          </div>
          <div v-if="cat.selected" class="category-items">
            <div v-for="item in cat.items.slice(0, 5)" :key="item.url" class="preview-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-url">{{ item.url }}</span>
            </div>
            <div v-if="cat.items.length > 5" class="more-items">
              还有 {{ cat.items.length - 5 }} 个书签...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤 3: 导入中 / 完成 -->
    <div v-else-if="step === 3" class="import-step import-result">
      <el-result
        :icon="importing ? 'info' : 'success'"
        :title="importing ? '正在导入...' : '导入完成'"
        :sub-title="importing ? '请稍候' : `成功导入 ${importedCount} 个书签`"
      >
        <template #extra v-if="!importing">
          <el-button type="primary" @click="handleClose">完成</el-button>
        </template>
      </el-result>
    </div>

    <template #footer>
      <div v-if="step === 1">
        <el-button @click="handleClose">取消</el-button>
      </div>
      <div v-else-if="step === 2">
        <el-button @click="step = 1">返回</el-button>
        <el-button type="primary" @click="handleImport" :disabled="selectedCount === 0">
          导入选中 ({{ selectedCount }} 个书签)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Upload } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

interface BookmarkItem {
  name: string;
  url: string;
  description: string;
}

interface ParsedCategory {
  name: string;
  items: BookmarkItem[];
  selected: boolean;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'import', data: { categories: string[]; items: BookmarkItem[] }): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const step = ref(1);
const parsedCategories = ref<ParsedCategory[]>([]);
const importing = ref(false);
const importedCount = ref(0);

const totalBookmarks = computed(() => {
  return parsedCategories.value.reduce((sum, cat) => sum + cat.items.length, 0);
});

const selectedCount = computed(() => {
  return parsedCategories.value
    .filter(cat => cat.selected)
    .reduce((sum, cat) => sum + cat.items.length, 0);
});

// 处理文件选择
const handleFileChange = async (file: any) => {
  try {
    const content = await readFile(file.raw);
    const parsed = parseBookmarks(content);
    
    if (parsed.length === 0) {
      ElMessage.warning('未找到有效的书签数据');
      return;
    }
    
    parsedCategories.value = parsed;
    step.value = 2;
  } catch (err) {
    ElMessage.error('文件解析失败，请确保是有效的书签文件');
    console.error(err);
  }
};

// 读取文件内容
const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// 解析书签 HTML
const parseBookmarks = (html: string): ParsedCategory[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const categories: ParsedCategory[] = [];
  
  // 查找所有文件夹 (H3 标签)
  const folders = doc.querySelectorAll('DT');
  
  folders.forEach(dt => {
    const h3 = dt.querySelector(':scope > H3');
    if (!h3) return;
    
    const folderName = h3.textContent?.trim() || '未命名分类';
    const items: BookmarkItem[] = [];
    
    // 查找该文件夹下的书签
    const dl = dt.querySelector(':scope > DL');
    if (dl) {
      const links = dl.querySelectorAll(':scope > DT > A');
      links.forEach(a => {
        const name = a.textContent?.trim() || '';
        const url = a.getAttribute('href') || '';
        
        if (name && url && url.startsWith('http')) {
          items.push({
            name,
            url,
            description: ''
          });
        }
      });
    }
    
    if (items.length > 0) {
      categories.push({
        name: folderName,
        items,
        selected: true
      });
    }
  });
  
  return categories;
};

// 执行导入
const handleImport = () => {
  step.value = 3;
  importing.value = true;
  
  const selectedCategories = parsedCategories.value.filter(cat => cat.selected);
  const categoryNames = selectedCategories.map(cat => cat.name);
  const allItems = selectedCategories.flatMap(cat => 
    cat.items.map(item => ({ ...item, categoryName: cat.name }))
  );
  
  importedCount.value = allItems.length;
  
  // 通知父组件执行导入
  emit('import', {
    categories: categoryNames,
    items: allItems
  });
  
  setTimeout(() => {
    importing.value = false;
  }, 500);
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  // 重置状态
  setTimeout(() => {
    step.value = 1;
    parsedCategories.value = [];
    importing.value = false;
    importedCount.value = 0;
  }, 300);
};

// 监听打开
watch(() => props.modelValue, (val) => {
  if (val) {
    step.value = 1;
  }
});
</script>

<style scoped lang="scss">
.import-step {
  min-height: 300px;
}

.import-help {
  margin-top: 20px;
  padding: 15px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  
  h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
  
  ul {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    
    li {
      margin: 5px 0;
    }
  }
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.preview-list {
  max-height: 400px;
  overflow-y: auto;
}

.preview-category {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  
  .category-header {
    margin-bottom: 8px;
  }
  
  .category-items {
    padding-left: 24px;
  }
  
  .preview-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 13px;
    border-bottom: 1px dashed var(--el-border-color-lighter);
    
    .item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .item-url {
      flex: 1;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }
  }
  
  .more-items {
    padding: 5px 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.import-result {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
