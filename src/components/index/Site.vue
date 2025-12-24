<template>
  <div id="js-home-site" class="home-site">
    <!-- 标签筛选栏 -->
    <div v-if="allTags.length > 0 && !loading" class="tag-filter-bar">
      <div class="tag-filter-label">🏷️ 标签筛选：</div>
      <div class="tag-filter-list">
        <el-tag
          v-for="tag in allTags"
          :key="tag"
          :type="selectedTags.includes(tag) ? '' : 'info'"
          :effect="selectedTags.includes(tag) ? 'dark' : 'plain'"
          class="tag-filter-item"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </el-tag>
        <el-button
          v-if="selectedTags.length > 0"
          size="small"
          type="danger"
          plain
          @click="clearTags"
        >
          清除筛选
        </el-button>
      </div>
    </div>

    <!-- 热门书签展示 -->
    <div v-if="topBookmarks.length > 0 && !loading" class="hot-bookmarks-bar">
      <div class="hot-bookmarks-label">🔥 热门访问：</div>
      <div class="hot-bookmarks-list">
        <a
          v-for="(item, index) in topBookmarks"
          :key="item.id"
          :href="item.url"
          class="hot-bookmark-item"
          target="_blank"
          @click.prevent="handleItemClick(item, $event)"
        >
          <span class="hot-rank">{{ index + 1 }}</span>
          <span class="hot-name">{{ item.name }}</span>
          <el-tag size="small" type="warning">{{ item.clickCount || 0 }}</el-tag>
        </a>
      </div>
    </div>

    <div v-if="loading || dataValue.length === 0" class="site-container">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-empty v-else description="暂无数据" />
    </div>
    <template v-else>
      <section v-for="(category, catIndex) in dataValue" :key="category.id" class="category-section" :data-cat-index="catIndex" :id="`site-anchor-${category.name}`">
        <div class="site-item">
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
                @contextmenu.prevent="showContextMenu($event, item, catIndex, itemIndex)"
                @touchstart="handleTouchStart($event, item, catIndex, itemIndex)"
                @touchend="handleMouseUp"
              >
                <a
                  class="inherit-text"
                  target="_blank"
                  @click.prevent="handleItemClick(item, $event)"
                >
                  <div class="site-card glass-card">
                    <div class="img-group">
                      <img v-lazy :src="`${Favicon}${item.url}`" class="site-icon" />
                    </div>
                    <div class="text-group">
                      <div class="site-name text">{{ item.name }}</div>
                      <div class="site-desc text">{{ item.description }}</div>
                      <div class="site-tags" v-if="item.tags && item.tags.length > 0">
                        <el-tag
                          v-for="tag in item.tags"
                          :key="tag"
                          size="small"
                          type="info"
                          effect="plain"
                        >
                          {{ tag }}
                        </el-tag>
                      </div>
                    </div>
                    <div class="hover-glow"></div>
                  </div>
                </a>
              </li>
              <i style="width: 200px" v-for="i in 6" :key="i"></i>
            </ul>
          </main>
        </div>
      </section>
    </template>

    <!-- Context Menu -->
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
          {{ contextMenu.item?.pinned ? '取消置顶' : '置顶' }}
        </div>
        <div class="menu-item" @click="startMove"><el-icon><Rank /></el-icon> 移动位置</div>
        <div class="menu-item" @click="handleEdit"><el-icon><Edit /></el-icon> 编辑</div>
        <div class="menu-item delete" @click="handleDelete"><el-icon><Delete /></el-icon> 删除</div>
      </template>
      <template v-else-if="contextMenu.category">
        <div class="menu-item" :class="{ disabled: isFirstCategory }" @click="!isFirstCategory && moveCategory(-1)">
          <el-icon><SortUp /></el-icon> 上移分类
        </div>
        <div class="menu-item" :class="{ disabled: isLastCategory }" @click="!isLastCategory && moveCategory(1)">
          <el-icon><SortDown /></el-icon> 下移分类
        </div>
        <div class="menu-item" @click="toggleCategoryPrivate">
          <el-icon v-if="contextMenu.category.private"><View /></el-icon>
          <el-icon v-else><Hide /></el-icon>
          {{ contextMenu.category.private ? '取消隐藏 (设为公开)' : '隐藏分类 (仅登录可见)' }}
        </div>
      </template>
    </div>

    <!-- Edit Dialog -->
    <SiteDialog
      v-model="showEditDialog"
      :form="editForm"
      :categories="availableCategories"
      :is-edit="true"
      @save="saveSite"
    />

    <!-- Moving Ghost Element -->
    <div
      v-if="moveState.active && moveState.item"
      class="ghost-element"
      :style="{ top: moveState.y + 'px', left: moveState.x + 'px' }"
    >
      <div class="site-card glass-card">
        <div class="img-group">
          <img :src="`${Favicon}${moveState.item.url}`" class="site-icon" />
        </div>
        <div class="text-group">
          <div class="site-name text">{{ moveState.item.name }}</div>
        </div>
      </div>
      <div class="move-tip">点击目标位置放置</div>
    </div>
  </div>
</template>

<script setup>
import { useMainStore } from '@/store'
import { Favicon } from '@/config'
import { openUrl as utilsOpenUrl } from '@/utils'
import unloadImg from '@/assets/img/error/image-error.png'
import loadImg from '@/assets/img/loading/3.gif'
import { ref, onMounted, computed, watch, onUnmounted, reactive } from 'vue'
import { useAdminStore } from '@/store/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank, Edit, Delete, Top, Bottom, View, Hide, SortUp, SortDown } from '@element-plus/icons-vue'
import SiteDialog from '@/components/SiteDialog.vue'

const adminStore = useAdminStore()
const store = useMainStore()
const rawDataValue = ref([]) // 存储原始数据
const dataValue = computed(() => {
  const visitorLevel = adminStore.user?.level || 0;

  const filtered = rawDataValue.value
    .map(category => ({
      ...category,
      content: category.content.filter(item => {
        // 等级过滤：书签等级必须小于等于访问者等级
        if (item.level !== undefined && item.level > visitorLevel) return false;
        
        // 标签过滤：如果选中了标签，只显示包含这些标签的书签
        if (selectedTags.value.length > 0) {
          if (!item.tags || !Array.isArray(item.tags)) return false;
          const hasMatchingTag = selectedTags.value.some(tag => item.tags.includes(tag));
          if (!hasMatchingTag) return false;
        }
        
        if (!adminStore.isAuthenticated) {
          return !item.private
        }
        return true
      })
    }))
    .filter(category => {
      // 移动模式下不过滤空分类，方便放入
      if (moveState.active && adminStore.isAuthenticated) return true

      // 分类等级过滤
      if (category.level !== undefined && category.level > visitorLevel) return false;

      if (!adminStore.isAuthenticated) {
        return !category.private && category.content.length > 0
      }
      return category.content.length > 0
    })

  // 处理置顶项 (常用推荐)
  const pinnedItems = []
  rawDataValue.value.forEach(cat => {
    // 隐藏分类下的置顶项不显示
    if (cat.level !== undefined && cat.level > visitorLevel) return;

    cat.content.forEach(item => {
      if (item.pinned) {
        // 等级过滤
        if (item.level !== undefined && item.level > visitorLevel) return;

        // 如果未登录，检查私有属性
        if (!adminStore.isAuthenticated && item.private) {
            return
        }
        pinnedItems.push({ ...item, _isPinnedReplica: true })
      }
    })
  })

  if (pinnedItems.length > 0) {
    return [
      {
        id: -1, // 虚拟 ID
        name: '常用推荐',
        content: pinnedItems,
        isVirtual: true
      },
      ...filtered
    ]
  }

  return filtered
})
const loading = ref(true)
let loadedCategories = {}

// 标签筛选状态
const selectedTags = ref([])

// 获取所有标签
const allTags = computed(() => {
  const tags = new Set()
  rawDataValue.value.forEach(cat => {
    cat.content.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tags.add(tag))
      }
    })
  })
  return Array.from(tags).sort()
})

// 切换标签选中状态
const toggleTag = (tag) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 清除所有标签筛选
const clearTags = () => {
  selectedTags.value = []
}

// 热门书签 TOP 10
const topBookmarks = computed(() => {
  const allItems = []
  rawDataValue.value.forEach(cat => {
    cat.content.forEach(item => {
      if (item.clickCount && item.clickCount > 0) {
        allItems.push(item)
      }
    })
  })
  return allItems
    .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
    .slice(0, 10)
})

// Context Menu State
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  item: null,
  category: null,
  catIndex: -1,
  itemIndex: -1
})

// Dialog State
const showEditDialog = ref(false)
const editForm = ref({})
const availableCategories = computed(() => {
  return rawDataValue.value.map(c => ({ id: c.id, name: c.name }))
})

// Move State
const moveState = reactive({
  active: false,
  item: null,
  fromCatIndex: -1,
  fromItemIndex: -1,
  x: 0,
  y: 0,
  hoverCatIndex: -1,
  hoverItemIndex: -1
})

const isFirstCategory = computed(() => {
  if (!contextMenu.category) return false
  const hasVirtual = dataValue.value[0]?.isVirtual
  const catIndex = hasVirtual ? contextMenu.catIndex - 1 : contextMenu.catIndex
  return catIndex <= 0
})

const isLastCategory = computed(() => {
  if (!contextMenu.category) return false
  const hasVirtual = dataValue.value[0]?.isVirtual
  const catIndex = hasVirtual ? contextMenu.catIndex - 1 : contextMenu.catIndex
  return catIndex >= rawDataValue.value.length - 1
})

// Long Press Logic
let pressTimer = null
const PRESS_DELAY = 500

// 监听数据变化，同步到全局 store
watch(dataValue, (val) => {
  store.$state.site = val
}, { immediate: true })

onMounted(async () => {
  document.addEventListener('click', closeContextMenu)
  await loadData()
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await adminStore.getFileContent()
    if (data && data.content) {
      loadedCategories = transformData(data.content.categories)
      const categoryPrivateMap = data.content.categories.reduce((acc, cat) => {
        acc[cat.id] = !!cat.private
        return acc
      }, {})

      let items = data.content.items
      if (Array.isArray(items) && items.length > 0) {
        // 数据去重：防止因为之前的 Bug 产生的重复 ID 干扰
        const seenIds = new Set()
        items = items.filter(item => {
          if (!item.id || seenIds.has(item.id)) return false
          seenIds.add(item.id)
          return true
        })

        const arrays = {}
        Object.keys(loadedCategories).forEach(key => {
          arrays[key] = []
        })

        items.forEach(item => {
          if (item.categoryId && loadedCategories[item.categoryId]) {
            arrays[item.categoryId].push(item)
          }
        })

        const finalData = []
        Object.keys(loadedCategories).forEach(key => {
          const catId = parseInt(key)
          finalData.push({
            id: catId,
            name: loadedCategories[key],
            private: categoryPrivateMap[catId],
            content: arrays[key]
          })
        })
        rawDataValue.value = finalData
        store.$state.site = dataValue.value
      }
    }
  } catch (err) {
    console.error('加载数据失败', err)
  } finally {
    loading.value = false
  }
}

// Data Persistence
const saveData = async () => {
  try {
    const categories = rawDataValue.value.map(cat => ({
      id: cat.id,
      name: cat.name,
      private: cat.private
    }))

    // Flatten items from all categories
    const items = []
    rawDataValue.value.forEach(cat => {
      cat.content.forEach(item => {
        items.push({
          ...item,
          categoryId: cat.id
        })
      })
    })

    await adminStore.updateFileContent({ categories, items })
    ElMessage.success('保存成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
  }
}


// Interaction Logic
// handleMouseDown removed as requested by user

const handleTouchStart = (e, item, catIndex, itemIndex) => {
  if (!adminStore.isAuthenticated) return
  pressTimer = setTimeout(() => {
    // Touch event doesn't have clientX/Y directly on event object
    const touch = e.touches[0]
    showContextMenu({ clientX: touch.clientX, clientY: touch.clientY }, item, catIndex, itemIndex)
  }, PRESS_DELAY)
}

const handleMouseUp = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const handleItemClick = async (item, e) => {
  if (moveState.active) {
    return
  }

  if (moveState.active) return

  // 发送统计请求（静默，不等待响应）
  try {
    const username = adminStore.user?.username || 'admin'
    await fetch(`/api/sites/${item.id}/click?user=${username}`, {
      method: 'POST'
    })
  } catch (err) {
    // 静默失败，不影响用户体验
    console.log('统计更新失败', err)
  }

  utilsOpenUrl(item.url)
}


const togglePin = async () => {
  const item = contextMenu.item
  if (!item) return

  // 查找原始对象（因为常用推荐中的是副本）
  const originalItem = findOriginalItem(item.id)
  if (originalItem) {
    originalItem.pinned = !originalItem.pinned
  } else {
    // 如果没找到（兜底情况），直接修改当前对象
    item.pinned = !item.pinned
  }

  closeContextMenu()
  await saveData()
  ElMessage.success(item.pinned ? '已置顶' : '已取消置顶')
}

const findOriginalItem = (id) => {
  for (const cat of rawDataValue.value) {
    const found = cat.content.find(i => i.id === id)
    if (found) return found
  }
  return null
}

const findOriginalLocation = (id) => {
  for (let catIdx = 0; catIdx < rawDataValue.value.length; catIdx++) {
    const itemIdx = rawDataValue.value[catIdx].content.findIndex(i => i.id === id)
    if (itemIdx !== -1) {
      return { catIdx, itemIdx }
    }
  }
  return null
}

const showCategoryContextMenu = (e, category, catIndex) => {
  if (!adminStore.isAuthenticated || category.isVirtual) return
  
  if (e.preventDefault) e.preventDefault()
  
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.item = null
  contextMenu.category = category
  contextMenu.catIndex = catIndex
}

const toggleCategoryPrivate = async () => {
  const category = contextMenu.category
  if (!category) return
  
  // 查找原始分类对象
  const originalCat = rawDataValue.value.find(c => c.id === category.id)
  if (originalCat) {
    originalCat.private = !originalCat.private
    ElMessage.success(originalCat.private ? '该分类已设为隐藏' : '该分类已设为公开')
  }
  
  closeContextMenu()
  await saveData()
}

const moveCategory = async (direction) => {
  const category = contextMenu.category
  if (!category) return
  
  const hasVirtual = dataValue.value[0]?.isVirtual
  const currentIndex = hasVirtual ? contextMenu.catIndex - 1 : contextMenu.catIndex
  const targetIndex = currentIndex + direction
  
  if (targetIndex < 0 || targetIndex >= rawDataValue.value.length) return
  
  // 交换位置
  const temp = rawDataValue.value[currentIndex]
  rawDataValue.value[currentIndex] = rawDataValue.value[targetIndex]
  rawDataValue.value[targetIndex] = temp
  
  ElMessage.success(direction === -1 ? '已上移' : '已下移')
  closeContextMenu()
  await saveData()
}

const showContextMenu = (e, item, catIndex, itemIndex) => {
  if (!adminStore.isAuthenticated) return

  // Prevent default context menu
  if (e.preventDefault) e.preventDefault()

  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.item = item
  contextMenu.category = null
  contextMenu.catIndex = catIndex
  contextMenu.itemIndex = itemIndex

  // Clear timer to prevent click
  if (pressTimer) clearTimeout(pressTimer)
}

const closeContextMenu = () => {
  contextMenu.visible = false
}

// Edit Logic
const handleEdit = () => {
  editForm.value = { ...contextMenu.item }
  showEditDialog.value = true
  closeContextMenu()
}

const saveSite = async () => {
  const newItem = { ...editForm.value }

  // 查找原位置
  const location = findOriginalLocation(newItem.id)

  if (location) {
    // 如果分类改变了，或者是从原位置移除并重新插入
    const oldCatId = rawDataValue.value[location.catIdx].id
    if (newItem.categoryId !== oldCatId) {
      // 移除旧的
      rawDataValue.value[location.catIdx].content.splice(location.itemIdx, 1)
      // 添加到新分类
      const newCatIndex = rawDataValue.value.findIndex(c => c.id === newItem.categoryId)
      if (newCatIndex !== -1) {
        rawDataValue.value[newCatIndex].content.push(newItem)
      }
    } else {
      // 在原位置更新
      rawDataValue.value[location.catIdx].content[location.itemIdx] = newItem
    }
  } else {
    // 如果没找到原位置（新加？），则直接加到对应分类
    const newCatIndex = rawDataValue.value.findIndex(c => c.id === newItem.categoryId)
    if (newCatIndex !== -1) {
      rawDataValue.value[newCatIndex].content.push(newItem)
    }
  }

  showEditDialog.value = false
  await saveData()
}

const handleDelete = () => {
  const item = contextMenu.item
  if (!item) return

  ElMessageBox.confirm('确定要删除这个书签吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    const location = findOriginalLocation(item.id)
    if (location) {
      rawDataValue.value[location.catIdx].content.splice(location.itemIdx, 1)
      closeContextMenu()
      await saveData()
    }
  })
}

// Move Logic
const startMove = () => {
  const item = contextMenu.item
  if (!item) return

  moveState.active = true
  moveState.item = item
  // 置标记位，标识是否在移动副本
  moveState.isMovingReplica = !!item._isPinnedReplica

  moveState.x = contextMenu.x
  moveState.y = contextMenu.y

  closeContextMenu()
  document.addEventListener('mousemove', handleGlobalMouseMove)
  // No need for touchmove listener if we use fixed bar on mobile

  // Use timeout to avoid immediate click triggering placement
  setTimeout(() => {
    document.addEventListener('click', handlePlacementClick, { capture: true, once: true })
    document.addEventListener('touchend', handlePlacementClick, { capture: true, once: true })
  }, 100)
}

const handleGlobalMouseMove = (e) => {
  if (!moveState.active) return
  moveState.x = e.clientX + 10
  moveState.y = e.clientY + 10
}

// Removed handleGlobalTouchMove to allow scrolling

const isHovering = (catIndex, itemIndex) => {
  return moveState.hoverCatIndex === catIndex && moveState.hoverItemIndex === itemIndex
}

const handleMouseEnter = (catIndex, itemIndex) => {
  if (moveState.active) {
    moveState.hoverCatIndex = catIndex
    moveState.hoverItemIndex = itemIndex
  }
}

const handleCategoryClick = async (catIndex, e) => {
  if (moveState.active) {
    e.stopPropagation()
    const targetCat = dataValue.value[catIndex]
    if (targetCat?.isVirtual) return
    await performMove(catIndex, targetCat.content.length)
  }
}

const handlePlacementClick = async (e) => {
  e.stopPropagation()
  e.preventDefault()

  if (!moveState.active) return

  let targetCatIndex = -1
  let targetItemIndex = -1

  // Try to determine target from event coordinates (crucial for mobile tap)
  const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX)
  const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY)

  if (clientX && clientY) {
    const el = document.elementFromPoint(clientX, clientY)
    if (el) {
      const siteWrapper = el.closest('.site-wrapper')
      const categoryHeader = el.closest('.category-header')
      const categorySection = el.closest('.category-section')

      if (siteWrapper && siteWrapper.dataset.catIndex && siteWrapper.dataset.itemIndex) {
          targetCatIndex = parseInt(siteWrapper.dataset.catIndex)
          targetItemIndex = parseInt(siteWrapper.dataset.itemIndex)
      } else if (categoryHeader && categoryHeader.dataset.catIndex) {
          targetCatIndex = parseInt(categoryHeader.dataset.catIndex)
          if (!isNaN(targetCatIndex)) {
            const targetCat = dataValue.value[targetCatIndex]
            targetItemIndex = targetCat ? targetCat.content.length : 0
          }
      } else if (categorySection && categorySection.dataset.catIndex) {
          // If clicked on an empty area within a category section
          targetCatIndex = parseInt(categorySection.dataset.catIndex)
          if (!isNaN(targetCatIndex)) {
            const targetCat = dataValue.value[targetCatIndex]
            targetItemIndex = targetCat ? targetCat.content.length : 0
          }
      }
    }
  }

  // 保留 hover 状态作为兜底
  if (targetCatIndex === -1 && moveState.hoverCatIndex !== -1) {
      targetCatIndex = moveState.hoverCatIndex
      targetItemIndex = moveState.hoverItemIndex
  }


  if (targetCatIndex === -1) {
     cancelMove()
     return
  }
  
  await performMove(targetCatIndex, targetItemIndex)
}

const performMove = async (toPublicCatIndex, toItemIndex) => {
  const item = moveState.item
  if (!item) return
  
  // 目标分类是否为虚拟分类？
  if (dataValue.value[toPublicCatIndex]?.isVirtual) {
    cancelMove()
    return
  }

  // 查找原位置
  const location = findOriginalLocation(item.id)
  if (!location) {
    cancelMove()
    return
  }
  
  const fromCatIndex = location.catIdx
  const fromItemIndex = location.itemIdx

  // 映射公共索引到原始索引
  // 必须考虑 dataValue 中是否有虚拟分类影响索引偏移
  const hasVirtual = dataValue.value[0]?.isVirtual
  const toCatIndex = hasVirtual ? toPublicCatIndex - 1 : toPublicCatIndex
  
  if (toCatIndex < 0 || toCatIndex >= rawDataValue.value.length) {
    cancelMove()
    return
  }
  
  if (fromCatIndex === toCatIndex && fromItemIndex === toItemIndex) {
      cancelMove()
      return
  }
  
  // 从原位置移除
  rawDataValue.value[fromCatIndex].content.splice(fromItemIndex, 1)
  
  // 如果在同一个分类内移动，且是向后移，目标索引需要减1
  let finalToItemIndex = toItemIndex
  if (fromCatIndex === toCatIndex && fromItemIndex < toItemIndex) {
    finalToItemIndex--
  }
  
  if (finalToItemIndex < 0) finalToItemIndex = 0
  
  // 插入新位置
  rawDataValue.value[toCatIndex].content.splice(finalToItemIndex, 0, item)
  
  // 更新分类 ID
  item.categoryId = rawDataValue.value[toCatIndex].id
  
  cancelMove()
  await saveData()
}

const cancelMove = () => {
  moveState.active = false
  moveState.item = null
  moveState.hoverCatIndex = -1
  moveState.hoverItemIndex = -1
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('click', handlePlacementClick)
  document.removeEventListener('touchend', handlePlacementClick)
}

// Utils
function transformData(arr) {
  return arr.reduce((acc, item) => {
    acc[item.id] = item.name
    return acc
  }, {})
}

// Lazy Load Directive
const vLazy = {
  mounted(el, binding) {
    handleLazy(el, binding)
  },
  updated(el, binding) {
    handleLazy(el, binding)
  }
}
function handleLazy(el, binding) {
  let url = el.src
  el.src = loadImg
  let { unload = unloadImg } = binding.value || {}
  let observe = new IntersectionObserver(
    ([{ isIntersecting }]) => {
      if (isIntersecting) {
        el.src = url
        el.onload = function () {
          observe.unobserve(el)
        }
        el.onerror = function () {
          el.src = unload
          observe.unobserve(el)
        }
      }
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    }
  )
  observe.observe(el)
}
</script>

<style lang="scss" scoped>
.home-site {
  flex: 1;
  position: relative;
  min-height: 100vh;
  background-color: var(--gray-50);
  z-index: 1;
  transition: background-color 0.3s ease;

  // 标签筛选栏样式
  .tag-filter-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 20px;
    margin: 10px auto;
    width: calc(100% - 40px);
    background: var(--gray-0);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    
    .tag-filter-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-700);
      white-space: nowrap;
    }
    
    .tag-filter-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      
      .tag-filter-item {
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          transform: scale(1.05);
        }
      }
    }
  }

  // 热门书签区块样式
  .hot-bookmarks-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 20px;
    margin: 0 auto 10px;
    width: calc(100% - 40px);
    background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
    border-radius: 12px;
    border: 1px solid rgba(255, 100, 100, 0.1);
    
    .hot-bookmarks-label {
      font-size: 14px;
      font-weight: 500;
      color: #e74c3c;
      white-space: nowrap;
    }
    
    .hot-bookmarks-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      
      .hot-bookmark-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: white;
        border-radius: 8px;
        border: 1px solid var(--gray-200);
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        color: inherit;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: var(--el-color-primary);
        }
        
        .hot-rank {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          border-radius: 4px;
          
          &:nth-child(1) { background: #ffd700; color: #333; }
        }
        
        .hot-name {
          font-size: 13px;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      
      .hot-bookmark-item:nth-child(1) .hot-rank { background: #ffd700; color: #333; }
      .hot-bookmark-item:nth-child(2) .hot-rank { background: #c0c0c0; color: #333; }
      .hot-bookmark-item:nth-child(3) .hot-rank { background: #cd7f32; color: #fff; }
      .hot-bookmark-item:nth-child(n+4) .hot-rank { background: var(--gray-200); color: var(--gray-600); }
    }
  }

  .site-container {
    width: calc(100% - 20px);
    margin: 0 auto;
    background-color: var(--gray-0);
    border-radius: 2px;
    padding: 10px;
    transition: background-color 0.3s ease;
  }

  section {
    width: calc(100% - 20px);
    margin: 10px auto 0 auto;
    &:first-of-type {
      margin-top: 0px;
    }
    .site-item {
      padding: 10px;
      border-radius: 2px;
      background-color: var(--gray-0);
      box-sizing: border-box;
      transition: background-color 0.3s ease;
      header {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        cursor: pointer;
        
        .category-icon {
          font-size: 20px;
          font-weight: 500;
        }
        .category-title {
          margin-left: 8px;
          font-size: 16px;
          font-weight: 500;
        }
        .category-count {
          margin-left: 6px;
          font-size: 14px;
          color: var(--gray-400);
          font-weight: normal;
        }
      }
      main {
        ul {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;

          .site-wrapper {
            margin-top: 15px;
            
            &.moving-target {
              // Highlight where it will be dropped
              position: relative;
              &::before {
                content: '';
                position: absolute;
                left: -10px;
                top: 0;
                bottom: 0;
                width: 4px;
                background-color: var(--el-color-primary);
                border-radius: 2px;
              }
            }
            
            .site-card {
              position: relative;
              width: 220px;
              height: 64px;
              padding: 10px;
              display: flex;
              align-items: center;
              border-radius: 12px;
              background: var(--gray-o7);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              border: 1px solid var(--gray-o2);
              box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.1);
              transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
              overflow: hidden;
              user-select: none;

              @media screen and (max-width: 768px) {
                width: 170px;
                height: 56px;
                padding: 8px;
              }
              
              &.is-moving {
                opacity: 0.3;
                filter: grayscale(1);
              }

              .img-group {
                flex-shrink: 0;
                width: 44px;
                height: 44px;
                background: var(--gray-0);
                border-radius: 10px;
                padding: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: center;
                align-items: center;
                
                img {
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                }
              }

              .text-group {
                margin-left: 12px;
                flex: 1;
                min-width: 0;
                
                .site-name {
                  font-size: 14px;
                  font-weight: 600;
                  color: var(--gray-900);
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                
                .site-desc {
                  font-size: 11px;
                  color: var(--gray-500);
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-top: 2px;
                }

                .site-tags {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                  margin-top: 4px;
                  
                  .el-tag {
                    font-size: 10px;
                    padding: 0 4px;
                    height: 16px;
                    line-height: 14px;
                  }
                }
              }

              &:hover {
                transform: translateY(-5px) scale(1.02);
                background: var(--gray-0);
                border-color: var(--el-color-primary);
                box-shadow: 0 15px 30px -10px rgba(59, 130, 246, 0.5);
                
                .img-group {
                  transform: scale(1.05);
                }
              }
            }
          }
        }
      }
    }
  }
}

.context-menu {
  position: fixed;
  background: white;
  min-width: 120px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  padding: 4px 0;
  z-index: 9999;
  border: 1px solid var(--el-border-color-lighter);
  
  .menu-item {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background-color: var(--el-fill-color-light);
    }
    
    &.delete {
      color: #f56c6c;
      &:hover {
        background-color: #fef0f0;
      }
    }

    &.disabled {
      color: var(--el-text-color-placeholder);
      cursor: not-allowed;
      &:hover {
        background-color: transparent;
      }
    }
  }
}

.ghost-element {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  transform: translate(-5px, -5px);
  
  @media screen and (max-width: 768px) {
    left: 50% !important;
    bottom: 30px !important;
    top: auto !important;
    transform: translateX(-50%) !important;
  }
  
  .site-card {
    background: white;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    width: 200px;
    border: 1px solid var(--el-color-primary);
    
    .img-group {
      width: 32px;
      height: 32px;
      margin-right: 8px;
      img { width: 100%; height: 100%; }
    }
    .text-group {
      .site-name { font-weight: bold; }
    }
  }
  
  .move-tip {
    margin-top: 8px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
  }
}

.el-empty {
  padding: 40px;
  border-radius: 8px;
  background-color: #fff;
}
</style>
