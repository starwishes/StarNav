<template>
  <el-drawer v-model="store.$state.isShowDrawer" :with-header="false" direction="ltr" modal close-on-click-modal
     size="300px" class="nav-drawer-glass">
    <h2 style="text-align: center;font-size: 20px;margin-top: 20px;">{{ store.settings.siteName || t('notification.siteName') }}</h2>
    <div style="height: 40px;"></div>
    <div v-for="category in dataStore.siteData" :key="category.id" @click="changeAnchorPosition(category.name)"
      class="text item">{{ category.name }}</div>
  </el-drawer>
</template>

<script setup>
import { useMainStore } from '@/store';
import { useDataStore } from '@/store/data';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const store = useMainStore()
const dataStore = useDataStore()
const changeAnchorPosition = (name) => {
  let target = document.getElementById(`site-anchor-${name}`);
  // console.log(name);
  // 没有找到节点，退出执行
  // 计算目标元素距离视口顶部的距离
  let targetTop = target.getBoundingClientRect().top + window.scrollY;

  // 设置额外的滚动偏移量
  let additionalOffset = 75;

  // 计算最终的滚动位置
  let finalScrollPosition = targetTop - additionalOffset;

  // 滚动到最终位置
  window.scroll({
    top: finalScrollPosition,
    left: 0,
    behavior: 'smooth'
  });
  
  // 点击后关闭抽屉
  store.$state.isShowDrawer = false;
}
</script>
<style lang="scss" scoped>
.text {
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  color: #fff;
}
.item {
  padding: 12px 24px;
  margin: 8px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(10px);
    color: var(--ui-theme);
  }
}
h2 {
  color: #fff;
  letter-spacing: 2px;
  font-weight: 800;
}
</style>