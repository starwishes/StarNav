<template>
  <div id="js-home-site" class="home-site">
    <div v-if="loading || dataValue.length === 0" class="site-container">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-empty v-else description="暂无数据" />
    </div>
    <template v-else>
      <section v-for="(category, catIndex) in dataValue" :key="category.id" :id="`site-anchor-${category.name}`">
        <div class="site-item">
          <header :id="category.name" class="category-header" @click.stop="handleCategoryClick(catIndex, $event)">
            <i class="category-icon relative left-px-2 iconfont icon-tag"></i>
            <a class="category-title" :name="category.name">{{ category.name }}</a>
          </header>
          <main>
            <ul>
              <a 
                class="relative site-wrapper inherit-text" 
                target="_blank" 
                v-for="(item, itemIndex) in category.content" 
                :key="item.id" 
                @click.prevent="handleItemClick(item, $event)"
                @contextmenu.prevent="showContextMenu($event, item, catIndex, itemIndex)"
                @touchstart="handleTouchStart($event, item, catIndex, itemIndex)"
                @touchend="handleMouseUp"
                :class="{ 'moving-target': moveState.active && isHovering(catIndex, itemIndex) }"
                @mouseenter="handleMouseEnter(catIndex, itemIndex)"
              >
                <div class="site-card glass-card" :class="{ 'is-moving': moveState.active && moveState.item?.id === item.id }">
                  <div class="img-group">
                    <img v-lazy :src="`${Favicon}${item.url}`" class="site-icon" />
                  </div>
                  <div class="text-group">
                    <div class="site-name text">{{ item.name }}</div>
                    <div class="site-desc text">{{ item.description }}</div>
                  </div>
                  <div class="hover-glow"></div>
                </div>
              </a>
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
      <div class="menu-item" @click="startMove"><el-icon><Rank /></el-icon> 移动位置</div>
      <div class="menu-item" @click="handleEdit"><el-icon><Edit /></el-icon> 编辑</div>
      <div class="menu-item delete" @click="handleDelete"><el-icon><Delete /></el-icon> 删除</div>
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
import { Rank, Edit, Delete } from '@element-plus/icons-vue'
import SiteDialog from '@/components/SiteDialog.vue'

const adminStore = useAdminStore()
const store = useMainStore()
const rawDataValue = ref([]) // 存储原始数据
const dataValue = computed(() => {
  return rawDataValue.value
    .map(category => ({
      ...category,
      content: category.content.filter(item => {
        if (!adminStore.isAuthenticated) {
          return !item.private
        }
        return true
      })
    }))
    .filter(category => {
      // 移动模式下不过滤空分类，方便放入
      if (moveState.active && adminStore.isAuthenticated) return true
      
      if (!adminStore.isAuthenticated) {
        return !category.private && category.content.length > 0
      }
      return category.content.length > 0
    })
})
const loading = ref(true)
let loadedCategories = {}

// Context Menu State
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  item: null,
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

const handleItemClick = (item, e) => {
  if (moveState.active) {
    // Handling move click placement logic here or in global click?
    // Let's rely on global click handler for placement to capture category clicks too
    return
  }
  
  // If timer triggered menu contextMenu.visible check
  // But timer clears on mouseup. 
  // We need to prevent link opening if context menu opened.
  // Actually, opening context menu usually happens BEFORE mouse up if holding.
  // But standard "click" fires on mouseup.
  
  // If moving, don't open
  if (moveState.active) return 

  utilsOpenUrl(item.url)
}

const showContextMenu = (e, item, catIndex, itemIndex) => {
  if (!adminStore.isAuthenticated) return
  
  // Prevent default context menu
  if (e.preventDefault) e.preventDefault()
  
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.item = item
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
  // Update local data
  const { catIndex, itemIndex } = contextMenu
  const newItem = { ...editForm.value }
  
  // If category changed
  const oldCatId = rawDataValue.value[catIndex].id
  if (newItem.categoryId !== oldCatId) {
    // Remove from old
    rawDataValue.value[catIndex].content.splice(itemIndex, 1)
    // Add to new
    const newCatIndex = rawDataValue.value.findIndex(c => c.id === newItem.categoryId)
    if (newCatIndex !== -1) {
      rawDataValue.value[newCatIndex].content.push(newItem)
    }
  } else {
    // Update in place
    rawDataValue.value[catIndex].content[itemIndex] = newItem
  }
  
  showEditDialog.value = false
  await saveData()
}

const handleDelete = () => {
  ElMessageBox.confirm('确定要删除这个书签吗？', '提示', {
    type: 'warning'
  }).then(async () => {
    rawDataValue.value[contextMenu.catIndex].content.splice(contextMenu.itemIndex, 1)
    closeContextMenu()
    await saveData()
  })
}

// Move Logic
const startMove = () => {
  moveState.active = true
  moveState.item = contextMenu.item
  moveState.fromCatIndex = contextMenu.catIndex
  moveState.fromItemIndex = contextMenu.itemIndex
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
    await performMove(catIndex, rawDataValue.value[catIndex].content.length)
  }
}

const handlePlacementClick = async (e) => {
  e.stopPropagation()
  e.preventDefault()
  
  if (!moveState.active) return
  
  // Handle Cancel Button Click (if we add one, or generic cancel logic)
  // For now, if clicking 'ghost-element' (which is fixed on mobile), maybe ignore or cancel?
  // Current ghost is pointer-events-none.
  
  let targetCatIndex = -1
  let targetItemIndex = -1
  
  // Try to determine target from event coordinates (crucial for mobile tap)
  const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX)
  const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY)
  
  if (clientX && clientY) {
    // Hide ghost temporarily to peek underneath if it wasn't pointer-events: none
    // But it is none.
    const el = document.elementFromPoint(clientX, clientY)
    if (el) {
      // Find closest site item
      const siteWrapper = el.closest('.site-wrapper')
      const categoryHeader = el.closest('.category-header')
      
      if (siteWrapper) {
         // Find indices. This is tricky without data attributes.
         // Let's search in our refs? Or better: add data attributes to DOM.
         // Or rely on the loop structure if we can map DOM to data.
         // Adding data-cat-index and data-item-index to template is best.
         // But I can't easily modify template fully here without re-rendering everything.
         // WAIT! I can access the Vue component context if I use `__vueParentComponent` etc but that's hacky.
         // Let's modify the template to add data attributes!
         
         // Fallback: Use the hover state if available (desktop)
         if (moveState.hoverCatIndex !== -1) {
             targetCatIndex = moveState.hoverCatIndex
             targetItemIndex = moveState.hoverItemIndex
         }
      } else if (categoryHeader) {
         // Similar issue, need index.
         // Rely on manual lookup?
         // Let's look up by ID since ID is unique per category (name)
         // header :id="category.name"
         const catName = categoryHeader.id
         targetCatIndex = rawDataValue.value.findIndex(c => c.name === catName)
         if (targetCatIndex !== -1) {
            targetItemIndex = rawDataValue.value[targetCatIndex].content.length
         }
      }
    }
  }
  
  // If we still don't have a target (e.g. mobile tap on item didn't trigger mouseenter)
  // We REALLY need those data attributes.
  // I will update the template to include data-indices for robust lookups.
  // But for this 'replace_file_content' I can only change script?
  // No, I can change template too if I select a large range.
  // I will assume for this step I am only changing script logic and I need a robust way.
  // Actually, without data attributes, detecting index from element is slow/hard.
  // Strategy: Update template in next step? Or merge steps?
  // I'll assume hover works for desktop. 
  // For mobile, 'elementFromPoint' returns the DOM. 
  // Maybe I can traverse the DOM to find the index? 
  // parent ul > children... index of child.
  
  if (targetCatIndex === -1 && (clientX && clientY)) {
      const el = document.elementFromPoint(clientX, clientY)
      const siteWrapper = el?.closest('.site-wrapper')
      if (siteWrapper) {
          const ul = siteWrapper.parentElement
          const section = ul.closest('section')
          // Find category index based on section order?
          // This assumes sections match dataValue order.
          const sections = Array.from(document.querySelectorAll('.home-site section'))
          targetCatIndex = sections.indexOf(section)
          
          if (targetCatIndex !== -1) {
             const items = Array.from(ul.children).filter(c => c.classList.contains('site-wrapper'))
             targetItemIndex = items.indexOf(siteWrapper)
          }
      }
  }

  if (targetCatIndex === -1) {
     cancelMove()
     return
  }
  
  await performMove(targetCatIndex, targetItemIndex)
}

const performMove = async (toCatIndex, toItemIndex) => {
  const { fromCatIndex, fromItemIndex, item } = moveState
  
  if (fromCatIndex === toCatIndex && fromItemIndex === toItemIndex) {
      cancelMove()
      return
  }
  
  // Remove from old
  rawDataValue.value[fromCatIndex].content.splice(fromItemIndex, 1)
  
  // Adjust index if moving within same category and down
  let finalToItemIndex = toItemIndex
  if (fromCatIndex === toCatIndex && fromItemIndex < toItemIndex) {
    finalToItemIndex--
  }
  
  // Insert at new
  if (finalToItemIndex < 0) finalToItemIndex = 0
  
  // Safety check
  if (!rawDataValue.value[toCatIndex].content) rawDataValue.value[toCatIndex].content = []
  
  rawDataValue.value[toCatIndex].content.splice(finalToItemIndex, 0, item)
  
  // Update item categoryId
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
  background-color: #f9fafb;
  z-index: 1;

  .site-container {
    width: calc(100% - 20px);
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 2px;
    padding: 10px;
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
      background-color: #ffffff;
      box-sizing: border-box;
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
              background: rgba(255, 255, 255, 0.7);
              border: 1px solid rgba(255, 255, 255, 0.4);
              box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.05);
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
                background: #fff;
                border-radius: 10px;
                padding: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
                  color: #1f2937;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                
                .site-desc {
                  font-size: 11px;
                  color: #6b7280;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-top: 2px;
                }
              }

              &:hover {
                transform: translateY(-5px) scale(1.02);
                background: #fff;
                border-color: #3b82f6;
                box-shadow: 0 15px 30px -10px rgba(59, 130, 246, 0.3);
                
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
