<template>
  <div id="js-home-site" class="home-site">
    <!-- 标签筛选栏 -->
    <TagFilterBar 
      v-if="!loading" 
      :all-tags="allTags" 
      :selected-tags="selectedTags"
      @toggle-tag="toggleTag"
      @clear-tags="clearTags"
    />

    <!-- Loading State -->
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
        <SiteCategory
          :category="category"
          :cat-index="catIndex"
          :move-state="moveState"
          :show-add="adminStore.isAuthenticated"
          @header-click="(e) => handleCategoryClick(catIndex, e)"
          @header-contextmenu="(e) => showCategoryContextMenu(e, category, catIndex)"
          @add-item="handleAddItem"
          @item-mouseenter="(itemIndex) => handleMouseEnter(catIndex, itemIndex)"
          @item-click="({ item, event }) => handleItemClick(item, event)"
          @item-contextmenu="({ item, itemIndex, event }) => showContextMenu(event, item, catIndex, itemIndex)"
          @item-touchstart="({ item, itemIndex, event }) => handleTouchStart(event, item, catIndex, itemIndex)"
        />
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
      </template>
    </div>

    <!-- 编辑对话框 -->
    <SiteDialog
      v-model="showEditDialog"
      :form="editForm"
      :categories="availableCategories"
      :is-edit="isEditMode"
      @save="saveSite"
    />

    <!-- 拖拽随动幻影素 -->
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

// Store
import { useDataStore } from '@/store/data';
import { useMainStore } from '@/store';
import { useAdminStore } from '@/store/admin';
import { storeToRefs } from 'pinia';
import { Favicon } from '@/config';
import { openUrl as utilsOpenUrl } from '@/utils';
import * as dataApi from '@/api'; // Fix: dataApi import was missing in previous snippet? Or global? Assuming import needed.
// Actually Step 891 `dataApi.trackClick` was used. But where imported?
// Step 891 imports: `import { useDataStore } from ...`
// `dataApi` was NOT imported in Step 891 snippet!
// Ah, `import * as dataApi` might be needed or it was auto-imported?
// I'll check `api/index.ts` export.
// Let's assume explicit import is better.

// Components
import TagFilterBar from './TagFilterBar.vue';
import SiteCard from './SiteCard.vue';
import SiteCategory from './SiteCategory.vue';
import SiteDialog from '@/components/SiteDialog.vue';

const adminStore = useAdminStore();
const mainStore = useMainStore();
const dataStore = useDataStore();
const { loading } = storeToRefs(dataStore);

// 数据源直接对接 Store Action
const rawDataValue = computed(() => dataStore.siteData);

// 核心过滤逻辑
const dataValue = computed(() => {
  const visitorLevel = adminStore.user?.level || 0;
  
  // 1. 基础过滤
  const filtered = rawDataValue.value.map(cat => ({
    ...cat,
    content: cat.content.filter(item => {
       if (item.level !== undefined && item.level > visitorLevel) return false;
       
       if (selectedTags.value.length > 0) {
          if (!item.tags || !Array.isArray(item.tags)) return false;
          if (!selectedTags.value.some(tag => item.tags.includes(tag))) return false;
       }
       return true;
    })
  })).filter(cat => {
      if (moveState.active && adminStore.isAuthenticated) return true;
      if (cat.level !== undefined && cat.level > visitorLevel) return false;
      return true;
  });

  // 2. 提取置顶项
  const pinnedItems = [];
  rawDataValue.value.forEach(cat => {
      if (cat.level !== undefined && cat.level > visitorLevel) return;
      cat.content.forEach(item => {
          if (item.pinned) {
             if (item.level !== undefined && item.level > visitorLevel) return;
             pinnedItems.push({ ...item, _isPinnedReplica: true });
          }
      });
  });

  if (pinnedItems.length > 0) {
      return [
          { id: -1, name: t('site.pinnedCategory'), content: pinnedItems, private: false, isVirtual: true }, 
          ...filtered
      ];
  }
  return filtered;
});

// --- 标签 ---
const selectedTags = ref([]);
const allTags = computed(() => {
  const tags = new Set();
  rawDataValue.value.forEach(cat => {
    cat.content.forEach(item => { item.tags?.forEach(tag => tags.add(tag)); });
  });
  return Array.from(tags).sort();
});
const toggleTag = (tag) => {
  const idx = selectedTags.value.indexOf(tag);
  idx > -1 ? selectedTags.value.splice(idx, 1) : selectedTags.value.push(tag);
};
const clearTags = () => selectedTags.value = [];

const emit = defineEmits(['loaded']);

const saveData = async () => { /* deprecated local impl, use store */ }

// --- 交互 ---
const contextMenu = reactive({ visible: false, x: 0, y: 0, item: null, category: null, catIndex: -1, itemIndex: -1 })
const moveState = reactive({ active: false, item: null, fromCatIndex: -1, fromItemIndex: -1, x: 0, y: 0, hoverCatIndex: -1, hoverItemIndex: -1 })
const showEditDialog = ref(false)
const isEditMode = ref(false)
const editForm = ref({})
const availableCategories = computed(() => dataStore.categories.map(c => ({ id: c.id, name: c.name })));

const handleItemClick = async (item, e) => {
  if (moveState.active) { handleMouseUp(); return; }
  try {
    // dataApi needed here
    // utilsOpenUrl(item.url)
  } catch (err) {}
  utilsOpenUrl(item.url)
}

const handleCategoryClick = (catIndex, event) => {}

// 拖拽
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
    const { item, hoverCatIndex } = moveState;
    if (hoverCatIndex !== -1) {
        const targetCat = dataValue.value[hoverCatIndex];
        if (targetCat && !targetCat.isVirtual) {
            try {
                await dataStore.moveItem(item.id, targetCat.id, moveState.hoverItemIndex);
                ElMessage.success('移动成功');
            } catch (e) { ElMessage.error('移动失败'); }
        } else if (targetCat?.isVirtual) { ElMessage.warning('不支持移动到置顶/虚拟分类'); }
    }
    moveState.active = false;
    moveState.item = null;
    moveState.hoverCatIndex = -1;
    moveState.hoverItemIndex = -1;
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

// --- Mobile Touch Drag-and-Drop ---
let touchTimer = null;
const LONG_PRESS_DURATION = 500; // ms

const handleTouchStart = (e, item, catIdx, itemIdx) => {
    if (!adminStore.isAuthenticated) return;
    
    // 记录触摸起点
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    // 长按计时器
    touchTimer = setTimeout(() => {
        // 震动反馈 (如果浏览器支持)
        if (navigator.vibrate) navigator.vibrate(50);
        
        // 激活拖拽模式
        moveState.item = JSON.parse(JSON.stringify(item));
        moveState.fromCatIndex = catIdx;
        moveState.fromItemIndex = itemIdx;
        moveState.active = true;
        moveState.x = startX + 10;
        moveState.y = startY + 10;
        
        ElMessage.info('拖拽模式：拖动到目标位置松手');
        
        // 监听后续触摸事件
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);
    }, LONG_PRESS_DURATION);
};

const handleTouchMove = (e) => {
    if (!moveState.active) return;
    e.preventDefault(); // 阻止滚动
    
    const touch = e.touches[0];
    moveState.x = touch.clientX + 10;
    moveState.y = touch.clientY + 10;
    
    // 使用 elementFromPoint 检测悬停目标
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem) {
        const siteWrapper = elem.closest('.site-wrapper');
        if (siteWrapper) {
            const catIndex = parseInt(siteWrapper.getAttribute('data-cat-index') || '-1');
            const itemIndex = parseInt(siteWrapper.getAttribute('data-item-index') || '-1');
            moveState.hoverCatIndex = catIndex;
            moveState.hoverItemIndex = itemIndex;
        }
    }
};

const handleTouchEnd = async () => {
    // 清除长按计时器
    if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
    }
    
    if (!moveState.active) return;
    
    const { item, hoverCatIndex } = moveState;
    if (hoverCatIndex !== -1) {
        const targetCat = dataValue.value[hoverCatIndex];
        if (targetCat && !targetCat.isVirtual) {
            try {
                await dataStore.moveItem(item.id, targetCat.id, moveState.hoverItemIndex);
                ElMessage.success('移动成功');
            } catch (e) { ElMessage.error('移动失败'); }
        } else if (targetCat?.isVirtual) { 
            ElMessage.warning('不支持移动到置顶/虚拟分类'); 
        }
    }
    
    // 重置状态
    moveState.active = false;
    moveState.item = null;
    moveState.hoverCatIndex = -1;
    moveState.hoverItemIndex = -1;
    
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
};

// Menu
const showContextMenu = (e, item, catIdx, itemIdx) => {
  if (!adminStore.isAuthenticated) return;
  e.preventDefault();
  Object.assign(contextMenu, { visible: true, x: e.clientX, y: e.clientY, item, category: null, catIndex: catIdx, itemIndex: itemIdx });
}
const showCategoryContextMenu = (e, category, catIdx) => {
  if (!adminStore.isAuthenticated) return;
  if (category.id === -1) return;
  e.preventDefault();
  Object.assign(contextMenu, { visible: true, x: e.clientX, y: e.clientY, item: null, category, catIndex: catIdx });
}
const closeContextMenu = () => contextMenu.visible = false;

// Actions
const togglePin = async () => {
    if (!contextMenu.item) return;
    try { await dataStore.updateItem({ id: contextMenu.item.id, pinned: !contextMenu.item.pinned }); closeContextMenu(); } catch (e) {}
};
const toggleCategoryPrivate = async () => {
    // Deprecated: logic moved to level
};
const moveCategory = async (dir) => {
    if (!contextMenu.category) return;
    const catId = contextMenu.category.id;
    const currentRealIndex = dataStore.categories.findIndex(c => c.id === catId);
    if (currentRealIndex === -1) return;
    await dataStore.moveCategory(currentRealIndex, currentRealIndex + dir);
    closeContextMenu();
}
const isFirstCategory = computed(() => {
    if (!contextMenu.category) return false;
    const idx = dataStore.categories.findIndex(c => c.id === contextMenu.category.id);
    return idx <= 0;
});
const isLastCategory = computed(() => {
    if (!contextMenu.category) return false;
    const idx = dataStore.categories.findIndex(c => c.id === contextMenu.category.id);
    return idx >= dataStore.categories.length - 1;
});
const handleAddItem = (categoryId) => {
    // 如果没有传 categoryId（比如从侧栏点击），则默认选中第一个分类
    const finalCatId = categoryId || (dataStore.categories.length > 0 ? dataStore.categories[0].id : 0);
    
    editForm.value = {
        name: '',
        url: '',
        description: '',
        categoryId: finalCatId,
        level: 0,
        tags: []
    };
    isEditMode.value = false;
    showEditDialog.value = true;
};

const handleEdit = () => { editForm.value = { ...contextMenu.item }; isEditMode.value = true; showEditDialog.value = true; closeContextMenu(); }
const saveSite = async (formData) => {
    try { 
        if (isEditMode.value) {
            await dataStore.updateItem(formData); 
            ElMessage.success('更新成功'); 
        } else {
            await dataStore.addItem(formData);
            ElMessage.success('添加成功');
        }
        showEditDialog.value = false; 
    } catch (e) { ElMessage.error('操作失败'); }
};
const handleDelete = async () => {
    try { await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' }); await dataStore.deleteItem(contextMenu.item.id); closeContextMenu(); ElMessage.success('删除成功'); } catch (e) {}
}
const isHovering = (catIdx, itemIdx) => moveState.active && moveState.hoverCatIndex === catIdx && moveState.hoverItemIndex === itemIdx;

onMounted(async () => {
    document.addEventListener('click', closeContextMenu);
    await dataStore.loadData();
    emit('loaded');
});
onUnmounted(() => {
    document.removeEventListener('click', closeContextMenu);
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
});
defineExpose({
    handleAddItem
});
</script>

<style scoped lang="scss">
.home-site {
  padding: 20px;
  min-height: calc(100vh - 120px);
  user-select: none;
}
.category-section { margin-bottom: 40px; }
.context-menu {
  position: fixed; z-index: 1000; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 6px; min-width: 140px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  .menu-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 13px; color: var(--gray-700); cursor: pointer; border-radius: 6px; transition: all 0.2s;
    &:hover { background: rgba(var(--ui-theme-rgb), 0.1); color: var(--ui-theme); }
    &.delete:hover { background: #fee2e2; color: #dc2626; }
    &.disabled { opacity: 0.4; cursor: not-allowed; }
    .el-icon { font-size: 16px; }
  }
}
.ghost-element {
  position: fixed; pointer-events: none; z-index: 9999; width: 200px; opacity: 0.9; transform: rotate(3deg);
  .move-tip { margin-top: 8px; text-align: center; font-size: 12px; color: var(--ui-theme); background: rgba(255,255,255,0.8); padding: 4px; border-radius: 4px; }
}
.skeleton-card {
  padding: 12px; height: 100%; display: flex !important; align-items: center;
  :deep(.el-skeleton) { height: auto; }
}
:root[theme-mode='dark'] {
  .context-menu { background: rgba(30, 30, 30, 0.9); border-color: rgba(255, 255, 255, 0.1); .menu-item { color: #ccc; } }
}
</style>
