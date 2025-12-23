import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // 配置根路径
    resolve: {
      // ↓路径别名，主要是这部分
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    css: {
      preprocessorOptions: {
        // 使用新的API方式
        scss: {
          api: 'modern-compiler'
        }
      }
    },
    server: {
      // 配置host，局域网可访问
      host: '0.0.0.0',
      port: 8080,
      // 本地开发代理配置
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          // 既然后端就是 server.js 提供的 /api，这里不需要 rewrite
        }
      }
    }
  }
})
