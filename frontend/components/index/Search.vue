<template>
  <div class="search-container">
    <div class="search-wrapper">
      <!-- 单一搜索框 -->
      <div class="unified-search-box">
        <!-- 左侧模式切换区 -->
        <div class="mode-switcher">
          <!-- 本地搜索按钮 -->
          <div 
            class="mode-btn" 
            :class="{ active: searchMode === 'local' }"
            @click="switchMode('local')"
            title="本地书签搜索"
          >
            <el-icon :size="18"><Search /></el-icon>
          </div>
          
          <!-- 分割线 -->
          <div class="mode-divider"></div>
          
          <!-- 在线搜索按钮（带搜索引擎选择） -->
          <el-popover
            placement="bottom-start"
            :width="280"
            trigger="click"
            popper-class="search-engine-popover"
          >
            <template #reference>
              <div 
                class="mode-btn engine-btn" 
                :class="{ active: searchMode === 'online' }"
                @click="switchMode('online')"
                :title="currentEngine?.name || '在线搜索'"
              >
                <img 
                  v-if="currentEngine?.url"
                  :src="getEngineIcon(currentEngine.url)" 
                  class="engine-icon"
                  alt="icon"
                />
                <el-icon v-else :size="18"><ChromeFilled /></el-icon>
              </div>
            </template>
            <div class="engine-list">
              <div
                v-for="(engine, index) in onlineEngines"
                :key="index"
                class="engine-item"
                :class="{ active: currentEngine?.name === engine.name }"
                @click="selectEngine(engine)"
              >
                <div class="engine-info">
                  <img :src="getEngineIcon(engine.url)" class="engine-icon-list" alt="icon" />
                  <span class="name">{{ engine.name }}</span>
                </div>
                <el-icon v-if="currentEngine?.name === engine.name" class="check-icon"><Check /></el-icon>
                
                <!-- 仅登录后显示操作按钮 -->
                <div class="action-group" v-if="adminStore.isAuthenticated">
                   <el-icon 
                     class="action-icon move" 
                     :class="{ disabled: index === 0 }"
                     @click.stop="moveEngine(index, -1)"
                     title="上移"
                   ><Top /></el-icon>
                   <el-icon 
                     class="action-icon move" 
                     :class="{ disabled: index === onlineEngines.length - 1 }"
                     @click.stop="moveEngine(index, 1)"
                     title="下移"
                   ><Bottom /></el-icon>
                   <el-icon class="action-icon edit" @click.stop="openEditDialog(engine, index)" title="编辑"><Edit /></el-icon>
                   <el-icon class="action-icon delete" @click.stop="deleteEngine(index)" title="删除"><Delete /></el-icon>
                </div>
              </div>
              <!-- 仅登录后显示添加按钮 -->
              <div class="engine-item add-btn" v-if="adminStore.isAuthenticated" @click="openAddDialog">
                <el-icon><Plus /></el-icon>
                <span>添加搜索引擎</span>
              </div>
            </div>
          </el-popover>
        </div>
        
        <!-- 右侧输入区 -->
        <input
          ref="searchInputRef"
          v-model="searchText"
          class="search-input"
          :placeholder="searchMode === 'local' ? '搜索本地书签...' : `在 ${currentEngine?.name || '搜索引擎'} 中搜索...`"
          @input="handleInputChange"
          @focus="handleFocus"
          @blur="handleBlur"
          @keyup.enter="handleEnter"
        />
        
        <!-- 清除按钮 -->
        <div class="clear-btn" v-if="searchText" @click="clearSearch">
          <el-icon :size="16"><CircleClose /></el-icon>
        </div>
      </div>
      
      <!-- 搜索结果下拉 -->
      <div class="search-results-container" v-if="isActive && hasSearched && !loading && searchResults.length > 0">
        <div class="search-results">
          <ul>
            <a class="relative site inherit-text" v-for="item in searchResults" :key="item.id" @click="handleItemClick(item.url)">
              <el-card class="site-card" shadow="never">
                <div class="img-group">
                  <el-avatar :size="36" :src="`${Favicon}${item.url}`"></el-avatar>
                </div>
                <div class="text-group">
                  <div class="name text">{{ item.name }}</div>
                  <div class="name text describe">{{ item.description }}</div>
                </div>
              </el-card>
            </a>
          </ul>
        </div>
      </div>
      
      <!-- 搜索建议下拉（在线模式） -->
      <div class="search-results-container" v-if="isActive && searchMode === 'online' && suggestions.length > 0">
        <div class="suggestion-list">
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
        </div>
      </div>
      
      <!-- 搜索无结果 -->
      <div class="search-results-container empty" v-if="isActive && hasSearched && !loading && searchResults.length === 0 && searchMode === 'local' && searchText.trim()">
        <el-empty description="未找到相关书签" :image-size="60" />
      </div>
      
      <!-- Loading -->
      <div v-if="loading && isActive" class="loading search-results-container">
        <el-skeleton :rows="2" animated />
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
import { ref, reactive, watch, computed } from 'vue'
import { Favicon } from '@/config'
import { openUrl } from '@/utils'
import { useAdminStore } from '@/store/admin'
import { Search, Check, Plus, Delete, Edit, Top, Bottom, CircleClose } from '@element-plus/icons-vue'
import { ChromeFilled } from '@element-plus/icons-vue'
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

const adminStore = useAdminStore()

// ========== 统一搜索状态 ==========
const searchMode = ref<'local' | 'online'>('local') // 搜索模式
const searchText = ref('')
const searchResults = ref<SearchResultItem[]>([])
const hasSearched = ref(false)
const loading = ref(false)
const isActive = ref(false)
const debounceTimeout = ref<number | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 在线搜索建议
const suggestions = ref<string[]>([])
const activeSuggestionIndex = ref(-1)

// ========== 搜索引擎相关 ==========
const defaultEngines: SearchEngine[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Bing', url: 'https://cn.bing.com/search?q=' },
  { name: 'Google', url: 'https://www.google.com/search?q=' }
]

const searchEngines = ref<SearchEngine[]>([...defaultEngines])
const currentEngine = ref<SearchEngine | null>(defaultEngines[0])

// 计算属性：仅在线搜索引擎
const onlineEngines = computed(() => searchEngines.value.filter(e => e.url))

// 监听登录状态变化
watch(() => adminStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
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
    currentEngine.value = defaultEngines[0]
    searchEngines.value = [...defaultEngines]
  }
}, { immediate: true })

// ========== 搜索引擎管理 ==========
const showDialog = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)
const engineForm = reactive({ name: '', url: '' })

const getEngineIcon = (url: string) => {
  try {
    const urlObj = new URL(url)
    return `${Favicon}${urlObj.origin}`
  } catch (e) {
    return ''
  }
}

const selectEngine = (engine: SearchEngine) => {
  currentEngine.value = engine
  localStorage.setItem('current_search_engine', JSON.stringify(engine))
}

const openAddDialog = () => {
  isEditing.value = false
  engineForm.name = ''
  engineForm.url = ''
  showDialog.value = true
}

const openEditDialog = (engine: SearchEngine, index: number) => {
  isEditing.value = true
  editingIndex.value = index
  engineForm.name = engine.name
  engineForm.url = engine.url
  showDialog.value = true
}

const saveEngine = () => {
  if (!engineForm.name || !engineForm.url) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  if (isEditing.value && editingIndex.value > -1) {
    const realIndex = searchEngines.value.findIndex(e => e.name === onlineEngines.value[editingIndex.value]?.name)
    if (realIndex > -1) {
      searchEngines.value[realIndex] = { ...engineForm }
      if (currentEngine.value?.name === searchEngines.value[realIndex].name) {
        currentEngine.value = searchEngines.value[realIndex]
        localStorage.setItem('current_search_engine', JSON.stringify(currentEngine.value))
      }
    }
    ElMessage.success('修改成功')
  } else {
    searchEngines.value.push({ ...engineForm })
    ElMessage.success('添加成功')
  }
  
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
  showDialog.value = false
}

const deleteEngine = (index: number) => {
  const targetEngine = onlineEngines.value[index]
  if (!targetEngine) return
  
  if (onlineEngines.value.length <= 1) {
    ElMessage.warning('请至少保留一个搜索引擎')
    return
  }
  
  const realIndex = searchEngines.value.findIndex(e => e.name === targetEngine.name)
  if (realIndex === -1) return
  
  const isCurrent = currentEngine.value?.name === targetEngine.name
  searchEngines.value.splice(realIndex, 1)
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
  
  if (isCurrent) {
    currentEngine.value = onlineEngines.value[0] || defaultEngines[0]
    localStorage.setItem('current_search_engine', JSON.stringify(currentEngine.value))
  }
}

const moveEngine = (index: number, direction: number) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= onlineEngines.value.length) return
  
  // 获取真实索引
  const engine1 = onlineEngines.value[index]
  const engine2 = onlineEngines.value[newIndex]
  const realIndex1 = searchEngines.value.findIndex(e => e.name === engine1.name)
  const realIndex2 = searchEngines.value.findIndex(e => e.name === engine2.name)
  
  if (realIndex1 === -1 || realIndex2 === -1) return
  
  const temp = searchEngines.value[realIndex1]
  searchEngines.value[realIndex1] = searchEngines.value[realIndex2]
  searchEngines.value[realIndex2] = temp
  
  localStorage.setItem('user_search_engines', JSON.stringify(searchEngines.value))
}

// ========== 模式切换 ==========
const switchMode = (mode: 'local' | 'online') => {
  searchMode.value = mode
  // 清空之前的搜索结果
  searchResults.value = []
  suggestions.value = []
  hasSearched.value = false
  // 聚焦输入框
  searchInputRef.value?.focus()
}

// ========== 统一事件处理 ==========
const handleFocus = () => {
  isActive.value = true
}

const handleBlur = (e: FocusEvent) => {
  const target = e.relatedTarget as HTMLElement
  const isClickInsideSearch = document.querySelector('.search-wrapper')?.contains(target)
  if (!isClickInsideSearch) {
    setTimeout(() => {
      isActive.value = false
    }, 200)
  }
}

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
    if (searchMode.value === 'local') {
      performLocalSearch()
    } else {
      fetchSuggestions()
    }
  }, 300) as unknown as number
}

const clearSearch = () => {
  searchText.value = ''
  searchResults.value = []
  suggestions.value = []
  hasSearched.value = false
}

const handleEnter = () => {
  if (!searchText.value.trim()) return
  
  if (searchMode.value === 'local') {
    // 本地模式：打开第一个搜索结果
    if (searchResults.value.length > 0) {
      openUrl(searchResults.value[0].url)
    }
  } else {
    // 在线模式：跳转到搜索引擎
    if (currentEngine.value?.url) {
      window.open(currentEngine.value.url + encodeURIComponent(searchText.value), '_blank')
    }
  }
}

// 本地搜索
const performLocalSearch = async () => {
  if (!searchText.value.trim()) return

  loading.value = true
  hasSearched.value = true

  try {
    const data = await adminStore.getFileContent()
    if (!data || !data.content) return

    const keyword = searchText.value.toLowerCase()
    const filteredItems = data.content.items.filter((item: any) => {
      if (item.level !== undefined && item.level > (adminStore.user?.level || 0)) return false
      
      const nameMatch = item.name?.toLowerCase().includes(keyword)
      const descMatch = item.description?.toLowerCase().includes(keyword)
      const urlMatch = item.url?.toLowerCase().includes(keyword)
      const tagsMatch = item.tags?.some((tag: string) => tag.toLowerCase().includes(keyword))
      
      return nameMatch || descMatch || urlMatch || tagsMatch
    })

    filteredItems.sort((a: any, b: any) => {
      const aScore = (a.name?.toLowerCase().includes(keyword) ? 3 : 0) + 
                     (a.tags?.some((t: string) => t.toLowerCase().includes(keyword)) ? 2 : 0)
      const bScore = (b.name?.toLowerCase().includes(keyword) ? 3 : 0) + 
                     (b.tags?.some((t: string) => t.toLowerCase().includes(keyword)) ? 2 : 0)
      return bScore - aScore
    })

    searchResults.value = filteredItems.slice(0, 8)
  } catch (error) {
    console.error('本地搜索出错:', error)
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

// 获取在线搜索建议
const fetchSuggestions = async () => {
  if (!searchText.value.trim() || !currentEngine.value?.url) return
  try {
    const type = currentEngine.value?.name === 'Google' ? 'google' : 'baidu'
    const response = await fetch(`/api/suggest?keyword=${encodeURIComponent(searchText.value)}&type=${type}`)
    const data = await response.json()
    suggestions.value = data
  } catch (err) {
    console.error('Fetch suggestions error:', err)
  }
}

const handleSuggestionClick = (sug: string) => {
  searchText.value = sug
  suggestions.value = []
  handleEnter()
}

// ========== 通用处理 ==========
const handleItemClick = (url: string) => {
  setTimeout(() => {
    isActive.value = false
  }, 100)
  openUrl(url)
}
</script>

<style lang="scss" scoped>
.search-container {
  position: relative;
  margin: 120px auto 20px;
  width: 100%;
  z-index: 10;
  user-select: none; // 强制禁止选择，防止变色
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.unified-search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 24px;
  padding: 4px;
  margin: 16px; 
  
  // 极致静态化：移除 transition、box-shadow 和动态背景
  // 防止引发 backdrop-filter 的亮度重算
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.1); // 保持一致
  }
  
  &:focus-within {
    border-color: var(--el-color-primary);
    background: rgba(255, 255, 255, 0.1); // 保持一致
  }
}

.mode-switcher {
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 2px;
}

.mode-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.6);
  
  &:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
  
  &.active {
    background: var(--el-color-primary);
    color: #fff;
  }
  
  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .engine-icon {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    object-fit: cover;
  }
}

.mode-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.search-input {
  flex: 1;
  height: 40px;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: #fff;
  padding: 0 12px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.clear-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s;
  margin-right: 8px;
  
  &:hover {
    color: #fff;
  }
}

.search-engine-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 4px;
  width: 46px;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
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
  top: 48px;
  left: 0;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  background-color: rgba(30, 30, 40, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  padding: 12px;
  z-index: 9999;
  pointer-events: auto; // 确保结果列表可交互
  transition: opacity 0.2s ease;

  &.empty {
    padding: 20px;
    text-align: center;
  }

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
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
    flex-direction: column;
    gap: 8px;

    .site {
      text-decoration: none;
      width: 100%;
      transition: transform 0.2s ease;

      &:hover {
        transform: translateX(4px);

        .site-card {
          border-color: var(--el-color-primary-light-5);
          background: rgba(255, 255, 255, 0.12);
        }
      }

      .site-card {
        position: relative;
        width: 100%;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        border-radius: 8px;
        color: #fff;
        transition: all 0.2s;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        
        :deep(.el-card__body) {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0;
        }

        .img-group {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
          margin-right: 10px;
        }

        .text-group {
          flex: 1;
          min-width: 0;

          .name {
            font-weight: 500;
            font-size: 13px;
            line-height: 1.4;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .describe {
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
            margin-top: 2px;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }
    }
  }
}



.text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 移动端对话框适配
@media screen and (max-width: 480px) {
  :deep(.mobile-dialog) {
    width: 90% !important;
  }
}
</style>

