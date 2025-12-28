<template>
  <div id="js-home-site" class="home-site">
    <!-- 标签筛选栏 (已组件化) -->
    <TagFilterBar 
      v-if="!loading" 
      :all-tags="allTags" 
      :selected-tags="selectedTags"
      @toggle-tag="toggleTag"
      @clear-tags="clearTags"
    />

    <!-- 热门书签展示 (已组件化) -->
    <HotBookmarksBar 
      v-if="!loading" 
      :top-bookmarks="topBookmarks" 
      :loading="loading"
      @item-click="handleItemClick"
    />

    <!-- Loading / Empty State -->
    <div v-if="loading" class="site-container loading-state">
      <div class="category-section">
        <div class="site-item glass-panel">
          <header class="category-header" style="opacity: 0.6">
            <el-skeleton-item variant="rect" style="width: 24px; height: 24px; border-radius: 4px" />
            <el-skeleton-item variant="text" style="width: 150px; height: 24px" />
          </header>
          <ul>
            <li v-for="i in 12" :key="i" class="site-wrapper">
              <div class="site-card glass-card skeleton-card">
                <el-skeleton animated style="width: 100%">
                  <template #template>
                    <div style="display: flex; gap: 12px; align-items: center; padding: 4px 0;">
                      <el-skeleton-item variant="image" style="width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0" />
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden">
                        <el-skeleton-item variant="text" style="width: 60%; height: 16px" />
                        <el-skeleton-item variant="text" style="width: 90%; height: 12px" />
                      </div>
                    </div>
                  </template>
                </el-skeleton>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else-if="dataValue.length === 0" class="site-container">
      <el-empty description="暂无数据" />
    </div>

    <!-- 列表主渲染区 -->
    <template v-else>
      <section 
        v-for="(category, catIndex) in dataValue" 
        :key="category.id" 
        class="category-section"
        :data-cat-index="catIndex" 
        :id="`site-anchor-${category.name}`"
      >
        <div class="site-item glass-panel">
          <!-- 分类头部 -->
          <header 
            :id="category.name" 
            class="category-header" 
            :data-cat-index="catIndex" 
            @click.stop="handleCategoryClick(catIndex, $event)"
            @contextmenu.prevent="showCategoryContextMenu($event, category, catIndex)"
          >
            <i class="category-icon relative left-px-2 iconfont icon-tag"></i>
            <a class="category-title" :name="category.name">{{ category.name }}</a>
            <span class="category-count">({{ category.content.length }})</span>
          </header>

          <main>
            <ul>
              <li
                v-for="(item, itemIndex) in category.content"
                :key="item.id"
                class="site-wrapper"
                :class="{
                  'is-moving': moveState.active && moveState.item?.id === item.id,
                  'moving-target': isHovering(catIndex, itemIndex)
                }"
                :data-cat-index="catIndex"
                :data-item-index="itemIndex"
                @mouseenter="handleMouseEnter(catIndex, itemIndex)"
              >
                <!-- 书签卡片 (已组件化) -->
                <SiteCard 
                  :item="item" 
                  :favicon-url="`${Favicon}${item.url}`"
                  @click="(e) => handleItemClick(item, e)"
                  @contextmenu="(e) => showContextMenu(e, item, catIndex, itemIndex)"
                  @touchstart="(e) => handleTouchStart(e, item, catIndex, itemIndex)"
                />
              </li>
              <!-- 列表占位，保持布局整齐 -->
              <i style="width: 200px" v-for="i in 6" :key="i"></i>
            </ul>
          </main>
        </div>
      </section>
    </template>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <template v-if="contextMenu.item">
        <div class="menu-item" @click="togglePin">
          <el-icon v-if="contextMenu.item?.pinned"><Bottom /></el-icon>
          <el-icon v-else><Top /></el-icon>
          {{ contextMenu.item?.pinned ? t('context.unpin') : t('context.pin') }}
        </div>
        <div class="menu-item" @click="startMove"><el-icon><Rank /></el-icon> {{ t('context.move') }}</div>
        <div class="menu-item" @click="handleEdit"><el-icon><Edit /></el-icon> {{ t('common.edit') }}</div>
        <div class="menu-item delete" @click="handleDelete"><el-icon><Delete /></el-icon> {{ t('common.delete') }}</div>
      </template>
      <template v-else-if="contextMenu.category">
        <div class="menu-item" :class="{ disabled: isFirstCategory }" @click="!isFirstCategory && moveCategory(-1)">
          <el-icon><SortUp /></el-icon> {{ t('context.moveUp') }}
        </div>
        <div class="menu-item" :class="{ disabled: isLastCategory }" @click="!isLastCategory && moveCategory(1)">
          <el-icon><SortDown /></el-icon> {{ t('context.moveDown') }}
        </div>
        <div class="menu-item" @click="toggleCategoryPrivate">
          <el-icon v-if="contextMenu.category.private"><View /></el-icon>
          <el-icon v-else><Hide /></el-icon>
          {{ contextMenu.category.private ? t('context.show') : t('context.hide') }}
        </div>
      </template>
    </div>

    <!-- 编辑对话框 -->
    <SiteDialog
      v-model="showEditDialog"
      :form="editForm"
      :categories="availableCategories"
      :is-edit="true"
      @save="saveSite"
    />

    <!-- 拖拽随动幻影素 (复用 SiteCard) -->
    <div
      v-if="moveState.active && moveState.item"
      class="ghost-element"
      :style="{ top: moveState.y + 'px', left: moveState.x + 'px' }"
    >
      <SiteCard 
        :item="moveState.item" 
        :favicon-url="`${Favicon}${moveState.item.url}`" 
      />
      <div class="move-tip">点击目标位置放置</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Rank, Edit, Delete, Top, Bottom, 
  View, Hide, SortUp, SortDown 
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Store & Config
import { useMainStore } from '@/store'
import { useAdminStore } from '@/store/admin'
import { Favicon } from '@/config'
import { openUrl as utilsOpenUrl } from '@/utils'

// Components
import TagFilterBar from './TagFilterBar.vue'
import HotBookmarksBar from './HotBookmarksBar.vue'
import SiteCard from './SiteCard.vue'
import SiteDialog from '@/components/SiteDialog.vue'

const adminStore = useAdminStore()
const store = useMainStore()
const rawDataValue = ref([])
const loading = ref(true)

// --- 数据处理逻辑 ---

const dataValue = computed(() => {
  const visitorLevel = adminStore.user?.level || 0;
  const filtered = rawDataValue.value
    .map(category => ({
      ...category,
      content: category.content.filter(item => {
        if (item.level !== undefined && item.level > visitorLevel) return false;
        if (selectedTags.value.length > 0) {
          if (!item.tags || !Array.isArray(item.tags)) return false;
          if (!selectedTags.value.some(tag => item.tags.includes(tag))) return false;
        }
        if (!adminStore.isAuthenticated) return !item.private;
        return true;
      })
    }))
    .filter(category => {
      if (moveState.active && adminStore.isAuthenticated) return true;
      if (category.level !== undefined && category.level > visitorLevel) return false;
      if (!adminStore.isAuthenticated) return !category.private && category.content.length > 0;
      return category.content.length > 0;
    });

  // 处理置顶项
  const pinnedItems = [];
  rawDataValue.value.forEach(cat => {
    if (cat.level !== undefined && cat.level > visitorLevel) return;
    cat.content.forEach(item => {
      if (item.pinned) {
        if (item.level !== undefined && item.level > visitorLevel) return;
        if (!adminStore.isAuthenticated && item.private) return;
        pinnedItems.push({ ...item, _isPinnedReplica: true });
      }
    });
  });

  return pinnedItems.length > 0 
    ? [{ id: -1, name: t('site.pinnedCategory'), content: pinnedItems, isVirtual: true }, ...filtered]
    : filtered;
});

// --- 标签与热门逻辑 ---

const selectedTags = ref([])
const allTags = computed(() => {
  const tags = new Set()
  rawDataValue.value.forEach(cat => {
    cat.content.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag))
    })
  })
  return Array.from(tags).sort()
})

const toggleTag = (tag) => {
  const idx = selectedTags.value.indexOf(tag)
  idx > -1 ? selectedTags.value.splice(idx, 1) : selectedTags.value.push(tag)
}
const clearTags = () => selectedTags.value = []

const topBookmarks = computed(() => {
  const all = []
  rawDataValue.value.forEach(cat => cat.content.forEach(i => i.clickCount > 0 && all.push(i)))
  return all.sort((a, b) => b.clickCount - a.clickCount).slice(0, 10)
})

// --- API 调用逻辑 ---

const loadData = async () => {
  loading.value = true
  try {
    const data = await adminStore.getFileContent()
    if (data?.content) {
      const categoryMap = data.content.categories.reduce((acc, cat) => {
        acc[cat.id] = { name: cat.name, private: !!cat.private };
        return acc;
      }, {});
      
      const arrays = {};
      Object.keys(categoryMap).forEach(id => arrays[id] = []);
      
      const seenIds = new Set();
      (data.content.items || []).forEach(item => {
        if (item.id && !seenIds.has(item.id) && categoryMap[item.categoryId]) {
          seenIds.add(item.id);
          arrays[item.categoryId].push(item);
        }
      });

      rawDataValue.value = Object.keys(categoryMap).map(id => ({
        id: parseInt(id),
        name: categoryMap[id].name,
        private: categoryMap[id].private,
        content: arrays[id]
      }));
    }
  } catch (err) { console.error('Load Error', err) }
  finally { loading.value = false }
}

const saveData = async () => {
  try {
    const categories = rawDataValue.value.map(c => ({ id: c.id, name: c.name, private: c.private }));
    const items = [];
    rawDataValue.value.forEach(c => c.content.forEach(i => items.push({ ...i, categoryId: c.id })));
    await adminStore.updateFileContent({ categories, items });
    ElMessage.success('保存成功');
  } catch (e) { ElMessage.error('保存失败') }
}

// --- 交互与拖拽逻辑 ---

const contextMenu = reactive({ visible: false, x: 0, y: 0, item: null, category: null, catIndex: -1, itemIndex: -1 })
const moveState = reactive({ active: false, item: null, fromCatIndex: -1, fromItemIndex: -1, x: 0, y: 0, hoverCatIndex: -1, hoverItemIndex: -1 })
const showEditDialog = ref(false)
const editForm = ref({})
const availableCategories = computed(() => rawDataValue.value.map(c => ({ id: c.id, name: c.name })))

const handleItemClick = async (item, e) => {
  if (moveState.active) {
    // 拖拽过程中的点击，视为放置
    handleMouseUp();
    return;
  }
  try {
    const username = adminStore.user?.login || 'admin'
    fetch(`/api/sites/${item.id}/click?user=${username}`, { method: 'POST' }).catch(() => {});
  } catch (err) {}
  utilsOpenUrl(item.url)
}

// 拖拽相关
const startMove = () => {
  const { item, catIndex, itemIndex } = contextMenu;
  moveState.item = JSON.parse(JSON.stringify(item));
  moveState.fromCatIndex = catIndex;
  moveState.fromItemIndex = itemIndex;
  moveState.active = true;
  moveState.x = contextMenu.x;
  moveState.y = contextMenu.y;
  closeContextMenu();
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  ElMessage.info('拖拽模式：点击目标位置放置书签');
}

const handleGlobalMouseMove = (e) => {
  if (!moveState.active) return;
  moveState.x = e.clientX + 10;
  moveState.y = e.clientY + 10;
}

const handleMouseEnter = (catIndex, itemIndex) => {
  if (!moveState.active) return;
  moveState.hoverCatIndex = catIndex;
  moveState.hoverItemIndex = itemIndex;
}

const handleMouseUp = async () => {
  if (!moveState.active) return;
  
  const { item, fromCatIndex, fromItemIndex, hoverCatIndex, hoverItemIndex } = moveState;
  
  // 检查是否在合法位置放置
  if (hoverCatIndex !== -1) {
    const targetCat = rawDataValue.value[hoverCatIndex];
    if (targetCat) {
      // 从原位置移除
      const sourceCat = rawDataValue.value[fromCatIndex];
      sourceCat.content.splice(fromItemIndex, 1);
      
      // 插入新位置
      const insertIdx = hoverItemIndex === -1 ? targetCat.content.length : hoverItemIndex;
      targetCat.content.splice(insertIdx, 0, item);
      
      await saveData();
    }
  }

  // 重置状态
  moveState.active = false;
  moveState.item = null;
  moveState.hoverCatIndex = -1;
  moveState.hoverItemIndex = -1;
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

// 右键菜单与分类操作 (保持原有逻辑)
const showContextMenu = (e, item, catIdx, itemIdx) => {
  if (!adminStore.isAuthenticated) return;
  e.preventDefault();
  Object.assign(contextMenu, { visible: true, x: e.clientX, y: e.clientY, item, category: null, catIndex: catIdx, itemIndex: itemIdx });
}
const showCategoryContextMenu = (e, category, catIdx) => {
  if (!adminStore.isAuthenticated || category.isVirtual) return;
  e.preventDefault();
  Object.assign(contextMenu, { visible: true, x: e.clientX, y: e.clientY, item: null, category, catIndex: catIdx });
}
const closeContextMenu = () => contextMenu.visible = false;

const togglePin = async () => {
  const original = findOriginalItem(contextMenu.item.id);
  if (original) original.pinned = !original.pinned;
  closeContextMenu();
  await saveData();
};
const findOriginalItem = (id) => {
  for (const cat of rawDataValue.value) {
    const found = cat.content.find(i => i.id === id);
    if (found) return found;
  }
  return null;
};

// 分类可见性与排序
const toggleCategoryPrivate = async () => {
  const cat = rawDataValue.value.find(c => c.id === contextMenu.category.id);
  if (cat) cat.private = !cat.private;
  closeContextMenu();
  await saveData();
}
const moveCategory = async (dir) => {
  const hasV = dataValue.value[0]?.isVirtual;
  const curIdx = hasV ? contextMenu.catIndex - 1 : contextMenu.catIndex;
  const targetIdx = curIdx + dir;
  if (targetIdx >= 0 && targetIdx < rawDataValue.value.length) {
    [rawDataValue.value[curIdx], rawDataValue.value[targetIdx]] = [rawDataValue.value[targetIdx], rawDataValue.value[curIdx]];
    await saveData();
  }
  closeContextMenu();
}

const isFirstCategory = computed(() => {
  if (!contextMenu.category) return false;
  const hasV = dataValue.value[0]?.isVirtual;
  return (hasV ? contextMenu.catIndex - 1 : contextMenu.catIndex) <= 0;
});
const isLastCategory = computed(() => {
  if (!contextMenu.category) return false;
  const hasV = dataValue.value[0]?.isVirtual;
  return (hasV ? contextMenu.catIndex - 1 : contextMenu.catIndex) >= rawDataValue.value.length - 1;
});

// 编辑与删除
const handleEdit = () => { editForm.value = { ...contextMenu.item }; showEditDialog.value = true; closeContextMenu(); }
const saveSite = async (formData) => {
  const item = findOriginalItem(formData.id);
  if (item) Object.assign(item, formData);
  await saveData();
  showEditDialog.value = false;
};
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' });
    const cat = rawDataValue.value[contextMenu.catIndex];
    cat.content.splice(contextMenu.itemIndex, 1);
    await saveData();
    closeContextMenu();
  } catch (e) {}
}

const isHovering = (catIdx, itemIdx) => moveState.active && moveState.hoverCatIndex === catIdx && moveState.hoverItemIndex === itemIdx;

// 生命周期
onMounted(() => {
  document.addEventListener('click', closeContextMenu);
  loadData();
});
onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

watch(dataValue, (val) => store.$state.site = val, { immediate: true });
</script>

<style scoped lang="scss">
.home-site {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.category-section {
  margin-bottom: 40px;
  .site-item {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(15px) !important;
    -webkit-backdrop-filter: blur(15px) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 20px;
    padding: 24px;
    transition: all 0.3s ease;
    margin-bottom: 20px;

    &:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
    }
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    cursor: pointer;
    user-select: none;
    
    .category-title { 
      font-size: 1.25rem; 
      font-weight: 700; 
      color: var(--gray-800); 
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .category-count { 
      font-size: 14px; 
      color: var(--gray-400);
      margin-left: 4px;
    }
    .category-icon { 
      color: var(--ui-theme); 
      font-size: 1.2rem; 
      opacity: 0.8;
    }
  }
}

ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  list-style: none;
  padding: 0;
}

.site-wrapper {
  transition: all 0.3s;
  &.is-moving { opacity: 0.3; transform: scale(0.95); }
  &.moving-target { border: 2px dashed var(--ui-theme); border-radius: 12px; }
}

.skeleton-card {
  padding: 12px;
  height: 100%;
  display: flex !important;
  align-items: center;
  :deep(.el-skeleton) { height: auto; }
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 6px;
  min-width: 140px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: var(--gray-700);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover { background: rgba(var(--ui-theme-rgb), 0.1); color: var(--ui-theme); }
    &.delete:hover { background: #fee2e2; color: #dc2626; }
    &.disabled { opacity: 0.4; cursor: not-allowed; }
    .el-icon { font-size: 16px; }
  }
}

.ghost-element {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  width: 200px;
  opacity: 0.9;
  transform: rotate(3deg);
  .move-tip {
    margin-top: 8px;
    text-align: center;
    font-size: 12px;
    color: var(--ui-theme);
    background: rgba(255,255,255,0.8);
    padding: 4px;
    border-radius: 4px;
  }
}

:root[theme-mode='dark'] {
  .category-title { color: #eee !important; }
  .context-menu { background: rgba(30, 30, 30, 0.9); border-color: rgba(255, 255, 255, 0.1); .menu-item { color: #ccc; } }
}
</style>
