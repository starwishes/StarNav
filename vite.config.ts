import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'
import { VitePWA } from 'vite-plugin-pwa'

// SW 预缓存忽略的管理懒加载 chunk 前缀（第 34 轮盲审 L10）。
//
// 命名来源：dist 产物 chunk 以异步组件文件名为前缀——AdminDashboard 来自 router 的
// 懒加载视图（views/AdminDashboard.vue），DataManager/MonitoringDashboard/
// SystemSettings/UserTable 来自 useAdminDashboardViews.ts 的 defineAsyncComponent。
// 这些 chunk 仅在登录后按需加载，且 /assets 已由 runtimeCaching 走 NetworkFirst，
// 不预缓存它们可让首页安装更快、部署后旧 chunk 尽快过期。
//
// 名单与懒加载组件命名隐性耦合：新增/改名上述组件时必须同步本列表。选择"常量收敛 +
// 注释互引"而非构建期断言，理由：断言需要把 config 与 useAdminDashboardViews 的源
// 文件/路由建立解析依赖，复杂度高于 5 个名字的清单收益；常量导出至少让清单成为显式
// 事实源，供 grep/审查发现漂移（漂移形态只是 glob 死条目或漏配，不破坏构建）。
const ADMIN_LAZY_CHUNK_PREFIXES = [
  'AdminDashboard',
  'DataManager',
  'MonitoringDashboard',
  'SystemSettings',
  'UserTable'
] as const

const adminLazyChunkGlobIgnores = ADMIN_LAZY_CHUNK_PREFIXES.flatMap((chunkName) => [
  `assets/js/${chunkName}-*.js`,
  `assets/css/${chunkName}-*.css`
])

// https://vitejs.dev/config/
export default defineConfig(() => {
  // 加载环境变量
  // const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      VitePWA({
        // 'prompt' 模式（第 33 轮）：检测到新版本时由 main.ts 弹确认框，用户确认
        // 后才 messageSkipWaiting 激活——避免 autoUpdate 下新版本一安装就接管页面
        // 自动 reload，丢掉用户未保存的表单输入。切换为 prompt 后插件不再自动
        // 注入 skipWaiting；显式保留 clientsClaim：用户确认激活后新 SW 立即接管
        // 受控页，controllerchange → reload 的链路确定生效（workbox generateSW
        // 默认不 claim 旧客户端）。
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'pwa-icon.svg', 'logo.svg'],
        workbox: {
          clientsClaim: true,
          // Drop previous precaches after deploy so old AdminDashboard-*.js hashes die quickly.
          cleanupOutdatedCaches: true,
          // 首页是核心离线场景，后台和反馈弹层属于按需能力，不必在安装阶段全部预缓存。
          // 注：多数管理子视图（AuditLog/BookmarkImport/ProfileSettings/RecycleBin/
          // SessionManager/StatsDashboard/SystemHealth/feedback-core）已静态并入
          // AdminDashboard chunk，其余为异步路由懒加载 chunk，名单按 dist/assets 实际
          // chunk 收敛，避免死条目。
          //
          // SPA fallback（NavigationRoute）只对页面导航生效：/api、/uploads 与
          // /api-docs.json 等非导航资源请求必须排除在 navigateFallback 之外，
          // 否则 SW 会把 404 的 API/资源路径 fallback 成 index.html（API 反而被
          // HTML 响应替代、上传链接返回首页），见第 21 轮审查。
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/api-docs/],
          globIgnores: adminLazyChunkGlobIgnores,
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
          // 站点默认/回退 locale 为 zh-CN（见 plugins/i18n.ts），显式声明避免插件默认 en
          lang: 'zh-CN',
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
            // Safari/Firefox 支持 SVG 图标，保留作为补充；SVG 可任意缩放，sizes 用 any
            {
              src: 'pwa-icon.svg',
              sizes: 'any',
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
              if (id.includes('pinia')) {
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
