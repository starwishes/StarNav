import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      // 生产环境开启 gzip 压缩
      viteCompression({
        verbose: true, // 是否在控制台输出压缩结果
        disable: false, // 是否禁用
        threshold: 10240, // 体积大于 threshold 才会被压缩，单位 b（10KB）
        algorithm: 'gzip', // 压缩算法，可选 ['gzip', 'brotliCompress', 'deflate', 'deflateRaw']
        ext: '.gz', // 生成的压缩包后缀
        deleteOriginFile: false // 压缩后是否删除源文件
      })
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // 配置根路径
    resolve: {
      // ↓路径别名，主要是这部分
      alias: {
        '@': resolve(__dirname, './frontend'),
        '@common': resolve(__dirname, './common')
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
