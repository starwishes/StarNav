/// <reference types="vite/client" />
declare module '*.vue' {
  import { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@element-plus/icons-vue';
declare module 'pinia-plugin-persistedstate';
