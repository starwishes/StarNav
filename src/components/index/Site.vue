<template>
  <div id="js-home-site" class="home-site">
    <div v-if="loading || dataValue.length === 0" class="site-container">
      <el-skeleton v-if="loading" :rows="5" animated />
      <el-empty v-else description="暂无数据" />
    </div>
    <template v-else>
      <section v-for="category in dataValue" :key="category.id" :id="`site-anchor-${category.name}`">
        <div class="site-item">
          <header :id="category.name">
            <i class="category-icon relative left-px-2 iconfont icon-tag"></i>
            <a class="category-title" :name="category.name">{{ category.name }}</a>
          </header>
          <main>
            <ul>
              <a class="relative site-wrapper inherit-text" target="_blank" v-for="item in category.content" :key="item.id" @click="openUrl(item.url)">
                <div class="site-card glass-card">
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
  </div>
</template>

<script setup>
import { useMainStore } from '@/store'
import { Favicon } from '@/config'
import { openUrl } from '@/utils'
import unloadImg from '@/assets/img/error/image-error.png'
import loadImg from '@/assets/img/loading/3.gif'
import { ref, onMounted, computed, watch } from 'vue'
import { useAdminStore } from '@/store/admin'
const adminStore = useAdminStore()
const store = useMainStore()
const rawDataValue = ref([]) // 存储原始数据
const dataValue = computed(() => {
  // 根据登录状态过滤数据
  return rawDataValue.value
    .map(category => ({
      ...category,
      content: category.content.filter(item => {
        // 如果未登录，过滤掉私有项目
        if (!adminStore.isAuthenticated) {
          return !item.private
        }
        return true
      })
    }))
    .filter(category => {
      // 如果未登录，过滤掉私有分类，且过滤掉空分类
      if (!adminStore.isAuthenticated) {
        return !category.private && category.content.length > 0
      }
      return category.content.length > 0
    })
})
const loading = ref(true) // 添加加载状态
let categories = {}

// 监听数据变化，同步到全局 store
watch(dataValue, (val) => {
  store.$state.site = val
}, { immediate: true })

// 使用 API 获取数据
onMounted(async () => {
  loading.value = true
  try {
    const data = await adminStore.getFileContent()
    if (data && data.content) {
      // 处理分类数据
      categories = transformData(data.content.categories)
      const categoryPrivateMap = data.content.categories.reduce((acc, cat) => {
        acc[cat.id] = !!cat.private
        return acc
      }, {})

      // 处理项目数据
      let items = data.content.items
      if (Array.isArray(items) && items.length > 0) {
        const arrays = {}
        Object.keys(categories).forEach(key => {
          arrays[key] = []
        })

        items.forEach(item => {
          if (item.categoryId && categories[item.categoryId]) {
            arrays[item.categoryId].push(item)
          }
        })

        const finalData = []
        Object.keys(categories).forEach(key => {
          const catId = parseInt(key)
          finalData.push({
            id: catId,
            name: categories[key],
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
})

//转换分类的返回数据
function transformData(arr) {
  return arr.reduce((acc, item) => {
    acc[item.id] = item.name
    return acc
  }, {})
}

const vLazy = {
  // 在绑定元素插入到 DOM 中时调用
  mounted(el, binding) {
    handleLazy(el, binding)
  },
  // 当绑定元素的 VNode 更新时调用
  updated(el, binding) {
    handleLazy(el, binding)
  }
}
function handleLazy(el, binding) {
  let url = el.src
  // 清空加载资源
  el.src = loadImg // Vue 3 中使用空字符串代替 loadImg 占位符
  let { unload = unloadImg } = binding.value || {} // 假设 unloadImg 是一个 URL 字符串
  // 元素进入离开可视区域触发回调
  let observe = new IntersectionObserver(
    ([{ isIntersecting }]) => {
      if (isIntersecting) {
        el.src = url
        el.onload = function () {
          observe.unobserve(el)
        }
        el.onerror = function () {
          // 加载失败时
          el.src = unload
          observe.unobserve(el)
        }
      }
    },
    {
      root: null, // 可选，指定 IntersectionObserver 的根
      rootMargin: '0px', // 可选，指定 IntersectionObserver 的根边缘
      threshold: 0.1 // 可选，指定 IntersectionObserver 的触发阈值
    }
  )
  observe.observe(el)
}
</script>

<style lang="scss" scoped>
.home-site {
  flex: 1;
  position: relative;
  height: 100vh;
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
        .category-icon {
          font-size: 20px;
          font-weight: 500;
        }
        .category-title {
          margin-left: 8px;
          font-size: 16px;
          font-weight: 500;
        }
        .selected {
          color: #ffffff;
          background-color: #60a5fa;
        }
        .tag-container {
          min-width: max-content;
        }
      }
      main {
        ul {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;

          .site-wrapper {
            margin-top: 15px;
            
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

              @media screen and (max-width: 768px) {
                width: 170px;
                height: 56px;
                padding: 8px;
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
  // 动态插入样式名，实现锚点效果
  .active-anchor {
    header {
      .category-icon {
        color: #ef4444 !important;
      }
      .category-title {
        color: #ef4444 !important;
      }
    }
  }
}
.el-empty {
  padding: 40px;
  border-radius: 8px;
  background-color: #fff;
}
</style>
