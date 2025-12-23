<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="copyright">
        &copy; {{ currentYear }} <a href="https://github.com/starwishes/Nav" target="_blank">{{ SITE_NAME }}</a>. All Rights Reserved.
      </div>
      <div class="icp" v-if="ICP_NUMBER">
        <a href="https://beian.miit.gov.cn/" target="_blank">{{ ICP_NUMBER }}</a>
      </div>
      <div class="powered">
        Powered by <a href="https://github.com/xia-66/nav" target="_blank">黑羽</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SITE_NAME, ICP_NUMBER } from '@/config'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style lang="scss" scoped>
.footer {
  width: 100%;
  padding: 20px 0;
  background-color: transparent;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  margin-top: auto;
  
  .footer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #6b7280;
    font-size: 14px;
    
    a {
      color: #6b7280;
      text-decoration: none;
      transition: color 0.3s;
      
      &:hover {
        color: #3b82f6;
      }
    }

    .powered {
      font-size: 12px;
      opacity: 0.8;
    }
  }
}
</style>
