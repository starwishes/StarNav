<template>
  <div class="search-container">
    <div class="search-input-wrapper">
      <el-input
        v-model="searchText"
        :placeholder="currentEngine ? `在 ${currentEngine.name} 中搜索...` : '请输入搜索内容'"
        clearable
        @input="handleInputChange"
        @clear="clearSearch"
        @focus="handleFocus"
        @blur="handleBlur"
        @keyup.enter="handleEnter"
      >
        <template #prefix>
          <el-popover
            placement="bottom-start"
            :width="300"
            trigger="click"
            popper-class="search-engine-popover"
            :disabled="!adminStore.isAuthenticated"
          >
            <template #reference>
              <div class="search-engine-trigger" :class="{ 'disabled': !adminStore.isAuthenticated }">
                <el-icon v-if="!currentEngine" :size="20"><Search /></el-icon>
                <img 
                  v-else 
                  :src="getEngineIcon(currentEngine.url)" 
                  class="engine-icon-trigger"
                  alt="icon"
                />
                <el-icon v-if="adminStore.isAuthenticated" class="arrow-icon"><ArrowDown /></el-icon>
              </div>
            </template>
            <div class="engine-list">
              <div
                v-for="(engine, index) in searchEngines"
                :key="index"
                class="engine-item"
                :class="{ active: currentEngine?.name === engine.name }"
                @click="selectEngine(engine)"
              >
                <div class="engine-info">
                  <img :src="getEngineIcon(engine.url)" class="engine-icon-list" alt="icon" />
                  <span class="name">{{ engine.name }}</span>
                </div>
                <!-- 选中状态显示对号 -->
                <el-icon v-if="currentEngine?.name === engine.name" class="check-icon"><Check /></el-icon>
                
                <!-- 操作按钮组 (移动/编辑/删除) -->
                <div class="action-group">
                   <el-icon 
                     class="action-icon move" 
                     :class="{ disabled: index === 0 }"
                     @click.stop="moveEngine(index, -1)"
                     title="上移"
                   ><Top /></el-icon>
                   <el-icon 
                     class="action-icon move" 
                     :class="{ disabled: index === searchEngines.length - 1 }"
                     @click.stop="moveEngine(index, 1)"
                     title="下移"
                   ><Bottom /></el-icon>
                   <el-icon class="action-icon edit" @click.stop="openEditDialog(engine, index)" title="编辑"><Edit /></el-icon>
                   <el-icon class="action-icon delete" @click.stop="deleteEngine(index)" title="删除"><Delete /></el-icon>
                </div>
              </div>
              <div class="engine-item add-btn" @click="openAddDialog">
                <el-icon><Plus /></el-icon>
                <span>添加搜索引擎</span>
              </div>
            </div>
          </el-popover>
        </template>
      </el-input>
      
      <div class="search-results-container" v-if="isActive && (suggestions.length > 0 || (hasSearched && !loading && searchResults.length > 0))">
        <!-- Keyword Suggestions -->
        <div class="suggestion-list" v-if="suggestions.length > 0">
          <div 
            v-for="(sug, index) in suggestions" 
            :key="index" 
            class="suggestion-item"
            :class="{ active: activeSuggestionIndex === index }"
            @click="handleSuggestionClick(sug)"
            @mouseenter="activeSuggestionIndex = index"
          >
            <el-icon><Search /></el-icon>
            <span>{{ sug }}</span>
          </div>
          <div class="suggestion-divider" v-if="searchResults.length > 0">本地搜索结果</div>
        </div>

        <div class="search-results" v-if="hasSearched && !loading && searchResults.length > 0">
          <ul>
            <a class="relative site inherit-text" target="_blank" v-for="item in searchResults" :key="item.id" @click="handleItemClick(item.url)">
              <el-card class="site-card" shadow="never">
                <div class="img-group">
                  <el-avatar :size="42" :src="`${Favicon}${item.url}`"> </el-avatar>
                </div>
                <div class="text-group">
                  <div class="name text">{{ item.name }}</div>
                  <div class="name text describe">{{ item.description }}</div>
                </div>
              </el-card>
            </a>
            <i style="width: 200px" v-for="i in 6" :key="i"></i>
          </ul>
        </div>
      </div>
      
      <!-- 本地搜索无结果提示，仅当不使用搜索引擎且无结果时显示 -->
      <div class="search-results-container" v-if="hasSearched && !loading && isActive && searchResults.length === 0 && suggestions.length === 0 && !currentEngine">
         <el-empty description="未找到相关结果" />
      </div>

      <div v-if="loading && isActive" class="loading search-results-container">
        <el-skeleton :rows="3" animated />
      </div>
    </div>

    <!-- 添加/编辑搜索引擎对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="isEditing ? '编辑搜索引擎' : '添加搜索引擎'"
      width="400px"
      append-to-body
      class="mobile-dialog"
    >
      <el-form :model="engineForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="engineForm.name" placeholder="例如：Google" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="engineForm.url" placeholder="例如：https://www.google.com/search?q=" />
          <div class="form-tip">URL 需包含查询参数，搜索词将拼接到末尾</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDialog = false">取消</el-button>
          <el-button type="primary" @click="saveEngine">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue'
import { Favicon } from '@/config'
import { openUrl } from '@/utils'
import { useAdminStore } from '@/store/admin'
import { Search, ArrowDown, Check, Plus, Delete, Edit, Top, Bottom } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 定义搜索结果项的接口
interface SearchResultItem {
  id: number
  name: string
  description: string
  url: string
  categoryId: number
  createTime?: string
  [key: string]: any
}

interface SearchEngine {
  name: string
  url: string
}

const searchText = ref('')
const searchResults = ref<SearchResultItem[]>([])
const hasSearched = ref(false)
const loading = ref(false)
const debounceTimeout = ref<number | null>(null)
const isActive = ref(false)
const suggestions = ref<string[]>([])
const activeSuggestionIndex = ref(-1)
const adminStore = useAdminStore()

// 搜索引擎相关
const defaultEngines: SearchEngine[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Bing', url: 'https://cn.bing.com/search?q=' },
  { name: 'Google', url: 'https://www.google.com/search?q=' }
]

const searchEngines = ref<SearchEngine[]>([...defaultEngines])
const currentEngine = ref<SearchEngine | null>(defaultEngines[0]) 

// 监听登录状态变化
watch(() => adminStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
     // 恢复用户保存的设置
     const savedEngines = localStorage.getItem('user_search_engines')
     if (savedEngines) {
       searchEngines.value = JSON.parse(savedEngines)
     }
     
     const savedCurrent = localStorage.getItem('current_search_engine')
     if (savedCurrent) {
       currentEngine.value = JSON.parse(savedCurrent)
     } else {
       currentEngine.value = defaultEngines[0] 
     }
  } else {
    // 未登录强制使用 Bing
    const bing = defaultEngines.find(e => e.name === 'Bing')
    if (bing) currentEngine.value = bing
    // 重置列表为默认（虽然可能看不到）
    searchEngines.value = [...defaultEngines] // 主要是为了防止缓存了旧数据
  }
}, { immediate: true })

const showDialog = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)
const engineForm = reactive({ name: '', url: '' })

// 初始化加载搜索引擎
onMounted(() => {
  // onMounted 里的逻辑已经由 watch immediate 覆盖，这里其实可以删了或者留着做兜底
  // 但为了不破坏原有结构，保留为空也行，或者移除重复逻辑
})

//获取搜索引擎图标
const getEngineIcon = (url: string) => {
  try {
    const urlObj = new URL(url)
    return `${Favicon}${urlObj.origin}`
  } catch (e) {
    return ''
  }
}

// 选择搜索引擎
const selectEngine = (engine: SearchEngine) => {
  if (!adminStore.isAuthenticated) return // 未登录禁止切换
  
  currentEngine.value = engine
  localStorage.setItem('current_search_engine', JSON.stringify(engine))
  // 聚焦回输入框
  handleFocus()
}

// 打开添加对话框
const openAddDialog = () => {
  isEditing.value = false
  engineForm.name = ''
  engineForm.url = ''
  showDialog.value = true
}

// 打开编辑对话框
const openEditDialog = (engine: SearchEngine, index: number) => {
  isEditing.value = true
  editingIndex.value = index
  engineForm.name = engine.name
  engineForm.url = engine.url
  showDialog.value = true
}

// 保存搜索引擎（添加或更新）
const saveEngine = () => {
  if (!engineForm.name || !engineForm.url) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  if (isEditing.value && editingIndex.value > -1) {
    // 更新
    searchEngines.value[editingIndex.value] = { ...engineForm }
    // 如果更新的是当前选中的，同步更新
    if (currentEngine.value?.name === searchEngines.value[editingIndex.value].name) {
       currentEngine.value = searchEngines.value[editingIndex.value]
       localStorage.setItem('current_search_engine', JSON.stringify(currentEngine.value))
    }
    ElMessage.success('修改成功')
  } else {
    // 添加
    searchEngines.value.push({ ...engineForm })
    ElMessage.success('添加成功')
  }
  
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
  showDialog.value = false
}

// 删除搜索引擎
const deleteEngine = (index: number) => {
  if (searchEngines.value.length <= 1) {
    ElMessage.warning('请至少保留一个搜索引擎')
    return
  }
  
  // 确认删除（这里直接删，也可以加确认框，为了流畅性先直接删）
  const deletedEngine = searchEngines.value[index]
  const isCurrent = currentEngine.value?.name === deletedEngine.name
  
  searchEngines.value.splice(index, 1)
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
  
  // 如果删除的是当前选中的，重置为第一个
  if (isCurrent) {
    currentEngine.value = searchEngines.value[0]
    localStorage.setItem('current_search_engine', JSON.stringify(currentEngine.value))
  }
}

// 移动搜索引擎
const moveEngine = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= searchEngines.value.length) return
  
  const temp = searchEngines.value[index]
  searchEngines.value[index] = searchEngines.value[newIndex]
  searchEngines.value[newIndex] = temp
  
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
}

// 处理回车键
const handleEnter = () => {
  if (!searchText.value.trim()) return
  
  if (currentEngine.value) {
    window.open(currentEngine.value.url + encodeURIComponent(searchText.value), '_blank')
  } else {
    // 如果没有选搜索引擎，且有搜索结果，打开第一个
    if (searchResults.value.length > 0) {
      openUrl(searchResults.value[0].url)
    }
  }
}

// 处理聚焦事件
const handleFocus = () => {
  isActive.value = true
}

// 处理失焦事件
const handleBlur = (e: FocusEvent) => {
  // 获取点击的元素
  const target = e.relatedTarget as HTMLElement

  // 只有当点击到搜索区域外才关闭结果，且不是在点击popover内的元素
  const isClickInsideSearch = document.querySelector('.search-container')?.contains(target)
  if (!isClickInsideSearch) {
    setTimeout(() => {
      isActive.value = false
    }, 200)
  }
}

// 处理输入变化的函数
const handleInputChange = () => {
  if (debounceTimeout.value !== null) {
    clearTimeout(debounceTimeout.value)
  }

  if (!searchText.value.trim()) {
    searchResults.value = []
    suggestions.value = []
    hasSearched.value = false
    return
  }

  isActive.value = true

  debounceTimeout.value = setTimeout(() => {
    performSearch()
    fetchSuggestions()
  }, 300) as unknown as number
}

// 获取搜索建议
const fetchSuggestions = async () => {
  if (!searchText.value.trim()) return
  try {
    const type = currentEngine.value?.name === 'Google' ? 'google' : 'baidu'
    const response = await fetch(`/api/suggest?keyword=${encodeURIComponent(searchText.value)}&type=${type}`)
    const data = await response.json()
    suggestions.value = data
  } catch (err) {
    console.error('Fetch suggestions error:', err)
  }
}

// 处理建议点击
const handleSuggestionClick = (sug: string) => {
  searchText.value = sug
  suggestions.value = []
  handleEnter()
}


// 清空搜索
const clearSearch = () => {
  searchText.value = ''
  searchResults.value = []
  suggestions.value = []
  hasSearched.value = false
}

// 执行搜索的函数
const performSearch = async () => {
  if (!searchText.value.trim()) {
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const data = await adminStore.getFileContent()
    if (!data || !data.content) return

    const keyword = searchText.value.toLowerCase()
    const filteredItems = data.content.items.filter((item: any) => {
      if (!adminStore.isAuthenticated && item.private) {
        return false
      }
      return item.name.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword)
    })

    searchResults.value = filteredItems.slice(0, 10) // 限制显示10条
  } catch (error) {
    console.error('搜索出错:', error)
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

// 处理点击项目
const handleItemClick = (url: string) => {
  setTimeout(() => {
    isActive.value = false
  }, 100)
  openUrl(url)
}
</script>

<style lang="scss" scoped>
.search-container {
  position: absolute;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  z-index: 99;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-engine-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 4px;
  width: 46px;
  height: 100%;
  border-right: 1px solid var(--el-border-color-lighter);
  margin-right: 8px;
  user-select: none;
  transition: opacity 0.3s;
  
  &:hover {
    opacity: 0.7;
  }
  
  .engine-icon-trigger {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    object-fit: cover;
  }
  
  .arrow-icon {
    font-size: 10px;
    color: var(--el-text-color-secondary);
    margin-left: 2px;
    transform: scale(0.8);
  }
}

.engine-list {
  padding: 4px 0;
  
  .engine-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.1s; // 缩短hover反应时间，避免闪烁
    border-radius: 4px;
    position: relative; // 为了绝对定位的 actions 准备（如果需要）
    
    &:hover {
      background-color: var(--el-fill-color-light);
      
      .action-group {
        opacity: 1;
        pointer-events: auto;
      }
      
      .check-icon {
        opacity: 0; // Hover时隐藏对号，显示操作按钮，避免重叠
      }
    }
    
    &.active {
      background-color: var(--el-color-primary-light-9);
      .name {
        color: var(--el-color-primary);
        font-weight: 500;
      }
    }
    
    .engine-info {
       display: flex;
       align-items: center;
       gap: 8px;
       flex: 1;
       overflow: hidden;
       padding-right: 100px; // 留出按钮空间
       
       .engine-icon-list {
         width: 16px;
         height: 16px;
         border-radius: 2px;
         flex-shrink: 0;
       }
       
       .name {
         font-size: 14px;
         white-space: nowrap;
         overflow: hidden;
         text-overflow: ellipsis;
       }
    }
    
    .check-icon {
      color: var(--el-color-primary);
      position: absolute;
      right: 12px;
    }
    
    .action-group {
      display: flex;
      align-items: center;
      gap: 6px; // 增加按钮间距
      position: absolute;
      right: 8px;
      opacity: 0; // 默认隐藏
      pointer-events: none;
      transition: opacity 0.2s;
      
      .action-icon {
         width: 32px;  // 固定宽
         height: 32px; // 固定高
         display: flex;
         justify-content: center;
         align-items: center;
         border-radius: 6px; // 圆角稍微大一点
         color: #606266;
         font-size: 20px; // 图标更大
         cursor: pointer;
         background-color: var(--gray-o9);
         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); // 阴影更明显
         margin-left: 2px;
         transition: all 0.2s;
         
         &:hover {
           background-color: var(--el-color-primary);
           color: white;
           transform: scale(1.15); // 放大效果更明显
           box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
           z-index: 10; // 确保放大后在最上层
         }
         
         &.delete:hover {
           background-color: #f56c6c;
           color: white;
         }
         
         &.disabled {
           color: #dcdfe6;
           background-color: rgba(255, 255, 255, 0.5);
           box-shadow: none;
           cursor: not-allowed;
           transform: none;
           
           &:hover {
             background-color: rgba(255, 255, 255, 0.5);
             color: #dcdfe6;
           }
         }
      }
    }
  }
  
  .add-btn {
    margin-top: 4px;
    border-top: 1px solid var(--el-border-color-lighter);
    color: var(--el-text-color-secondary);
    justify-content: center;
    gap: 4px;
    
    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  margin-top: 4px;
}

.loading {
  margin-top: 20px;
}

.search-results-container {
  position: absolute;
  top: 50px;
  left: 0;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  background-color: var(--gray-o8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--gray-o3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 16px;
  z-index: 9999;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--el-border-color-lighter);
    border-radius: 3px;
  }
}

.suggestion-list {
  margin-bottom: 12px;
  
  .suggestion-item {
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    border-radius: 8px;
    color: var(--el-text-color-primary);
    transition: all 0.2s;
    
    .el-icon {
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
    
    &:hover, &.active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      
      .el-icon {
        color: var(--el-color-primary);
      }
    }
  }
  
  .suggestion-divider {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    padding: 12px 12px 8px;
    border-top: 1px solid var(--el-border-color-extra-light);
    margin-top: 8px;
  }
}

.search-results {
  width: 100%;

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: flex-start;

    .site {
      margin-top: 0;
      text-decoration: none;
      width: calc(33.333% - 11px);
      transition: transform 0.2s ease;

      @media screen and (max-width: 768px) {
        width: calc(50% - 8px);
      }

      @media screen and (max-width: 480px) {
        width: 100%;
      }

      &:hover {
        transform: translateY(-3px);

        .site-card {
          border-color: var(--el-color-primary-light-5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
      }

      .site-card {
        position: relative;
        width: 100%;
        height: 70px;
        padding: 0;
        display: flex;
        align-items: center;
        border-radius: 8px;
        color: var(--el-text-color-primary);
        transition: all 0.3s;
        border: 1px solid var(--el-border-color-lighter);

        .img-group {
          position: absolute;
          left: 14px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          overflow: hidden;
          z-index: 2;
        }

        .text-group {
          width: calc(100% - 60px);
          display: block;
          margin-left: 66px;
          padding-right: 10px;

          .name {
            font-weight: 500;
            font-size: 14px;
            line-height: 1.4;
          }

          .describe {
            color: var(--el-text-color-secondary);
            font-size: 12px;
            margin-top: 4px;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }
      }
    }

    i {
      height: 0;
    }
  }
}

.text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  transition: all 0.3s ease;
  height: 46px;
  border-radius: 23px;
  border: 1px solid var(--el-border-color-lighter);
  padding-left: 0; 

  &:focus-within {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
    border-color: var(--el-color-primary);
  }
}

:deep(.el-input__inner) {
  height: 46px;
  line-height: 46px;
  font-size: 15px;
}

:deep(.el-input__prefix) {
  padding-left: 8px;
  margin-right: 0;
}

:deep(.el-input__suffix) {
  padding-right: 8px;
}

:deep(.el-card__body) {
  padding: 12px;
  height: 100%;
  display: flex;
  align-items: center;
}

.el-empty {
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
}
</style>
