import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(() => {
  // 加载环境变量
  // const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-icon.svg'],
        workbox: {
          // Drop previous precaches after deploy so old AdminDashboard-*.js hashes die quickly.
          cleanupOutdatedCaches: true,
          // 首页是核心离线场景，后台和反馈弹层属于按需能力，不必在安装阶段全部预缓存。
          // 注：多数管理子视图（AuditLog/BookmarkImport/ProfileSettings/RecycleBin/
          // SessionManager/StatsDashboard/SystemHealth/feedback-core）已静态并入
          // AdminDashboard chunk，其余为异步路由懒加载 chunk，名单按 dist/assets 实际
          // chunk 收敛，避免死条目。
          globIgnores: [
            'assets/js/AdminDashboard-*.js',
            'assets/js/DataManager-*.js',
            'assets/js/MonitoringDashboard-*.js',
            'assets/js/SystemSettings-*.js',
            'assets/js/UserTable-*.js',
            'assets/css/AdminDashboard-*.css',
            'assets/css/DataManager-*.css',
            'assets/css/MonitoringDashboard-*.css',
            'assets/css/SystemSettings-*.css',
            'assets/css/UserTable-*.css'
          ],
          runtimeCaching: [
            {
              // Hashed build assets: network first so image rebuilds do not stick to deleted chunk URLs.
              urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'starnav-build-assets',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // 经 /api/favicon 代理的站点图标：同源请求，缓存可控
              urlPattern: /\/api\/favicon\?url=/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'starnav-favicon-proxy',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
            // 注意：不再缓存任意跨源 favicon.ico。
            // 让 SW 拦截并缓存所有 http(s)://host/favicon.ico 会把页面发往任意
            // 第三方域的请求都纳入 SW 缓存（含 no-cors opaque 响应），既扩大
            // 拦截面又难以审计；这类图标改由浏览器 HTTP 缓存承担即可。
          ]
        },
        manifest: {
          name: '星语导航',
          short_name: 'StarNav',
          description: '您的个性化导航助手',
          theme_color: '#ffffff',
          icons: [
            // Chrome 的可安装性要求 PNG 图标（SVG 不满足 install criteria）；
            // 由 scripts/build-pwa-icons.mjs 从 pwa-icon.svg 光栅化生成。
            {
              src: 'pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            // Safari/Firefox 支持 SVG 图标，保留作为补充
            {
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
      // 第 16 轮：不再生成 .gz 预压缩产物。
      // vite-plugin-compression 上游多年未维护（peer 仅支持 vite ^2），且服务端已启用
      // compression() 动态压缩；.gz 预压缩只对"纯静态托管、不经本服务"的部署形态有意义，
      // 该形态不在本项目单进程（server.ts 静态托管 dist）的支持范围内，故移除依赖。
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    // 配置根路径
    resolve: {
      // ↓路径别名，主要是这部分
      alias: {
        '@': resolve(__dirname, './src/web'),
        '@common': resolve(__dirname, './src/shared'),
        'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js'
      }
    },

    build: {
      rollupOptions: {
        output: {
          // 更细粒度的代码分割
          manualChunks(id) {
            // 将 node_modules 按照包名进行分组
            if (id.includes('node_modules')) {
              // 路由运行时
              if (id.includes('vue-router')) {
                return 'router'
              }
              // 国际化运行时
              if (id.includes('vue-i18n') || id.includes('@intlify')) {
                return 'i18n'
              }
              // Vue 核心库（vue-i18n/vue-router 已在上方单独分组）
              // 注意：当前 rolldown 下 `vue` 包的模块经 vue-i18n 的
              // runtime esm-bundler 别名转发后，实际归属 i18n chunk，
              // 这里的 vue-core chunk 往往只是对 i18n chunk 的纯 re-export。
              // 分组意图是"按依赖归类便于缓存复用"，实际归属以产物为准，
              // 不追求进一步拆分（避免无收益的 chunk 抖动）。
              if (id.includes('vue')) {
                return 'vue-core'
              }
              // Pinia 状态管理
              if (id.includes('pinia') || id.includes('pinia-plugin-persistedstate')) {
                return 'store'
              }
              // 其他第三方库
              return 'vendor'
            }
          },
          // 优化 chunk 文件名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 降低 chunk 大小警告限制，鼓励更好的分割
      chunkSizeWarningLimit: 500,
      // 启用 sourcemap（可选，生产环境可关闭）
      sourcemap: false,
      // 压缩配置
      minify: 'terser',
      terserOptions: {
        compress: {
          // 只移除纯 console.log，保留 warn/error 便于线上排查
          pure_funcs: ['console.log'],
          drop_debugger: true
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
          target: 'http://localhost:3333',
          changeOrigin: true
          // 既然后端就是 server.js 提供的 /api，这里不需要 rewrite
        }
      }
    }
  }
})
