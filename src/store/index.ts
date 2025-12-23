import { defineStore } from 'pinia'

export const useMainStore = defineStore('mainStore', {
  state: () => {
    return {
      isShowDrawer: false,
      site: [],
      menu: [
        {
          index: 1,
          name: '首页',
          iconClass: 'iconfont icon-md-home'
        }
      ]
    }
  },
  getters: {},
  actions: {},

  persist: false
})
