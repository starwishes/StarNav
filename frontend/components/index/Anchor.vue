<template>
  <div id="js-home-nav" class="home-nav">
    <header></header>
    <main id="js-home-nav__main">
      <ul id="js-home-nav__main-ul">
        <li class="record-item pointer text" v-for="category in dataStore.siteData" :key="category.id" @click="changeAnchorPosition(category.name)">
          {{ category.name }}
        </li>
      </ul>
    </main>
  </div>
</template>
<script setup>
import { useDataStore } from '@/store/data'
import { ref } from 'vue'

const dataStore = useDataStore()
const changeAnchorPosition = name => {
  let target = document.getElementById(`site-anchor-${name}`)
  if (!target) return
  // 计算目标元素距离视口顶部的距离
  let targetTop = target.getBoundingClientRect().top + window.scrollY

  // 设置额外的滚动偏移量
  let additionalOffset = 75

  // 计算最终的滚动位置
  let finalScrollPosition = targetTop - additionalOffset

  // 滚动到最终位置
  window.scroll({
    top: finalScrollPosition,
    left: 0,
    behavior: 'smooth'
  })
}
</script>

<style lang="scss" scoped>
.home-nav {
  position: sticky;
  top: 15px;
  z-index: 100;
  width: calc(100% - 40px);
  max-width: 1200px;
  margin: 20px auto 30px auto;
  transform: translateZ(0); 
  will-change: backdrop-filter; // 稳定硬件加速
  user-select: none; // 禁用选择，根除选择变色
  padding: 10px 24px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  border-radius: 100px;
  // 极致静态化：移除 transition, box-shadow，固化背景亮度
  // 仅通过文字颜色或激活状态指示
  
  main {
    width: 100%;
    
    ul {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0;
      margin: 0;
      list-style: none;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }

      .record-item {
        cursor: pointer;
        padding: 8px 20px;
        border-radius: 40px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
        transition: all 0.2s ease;
        background: transparent;
        white-space: nowrap;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        &.active {
          background: var(--ui-theme);
          color: white;
          box-shadow: 0 4px 12px rgba(var(--ui-theme-rgb), 0.3);
        }
      }
    }
  }
}

:root[theme-mode='dark'] {
  .home-nav {
    background: rgba(0, 0, 0, 0.2);
    .record-item {
      color: #aaa;
      &:hover { color: var(--ui-theme); }
    }
  }
}
</style>
