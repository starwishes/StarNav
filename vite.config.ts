import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import pkg from './package.json'
import viteCompression from 'vite-plugin-compression'
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
          globIgnores: [
            'assets/js/AdminDashboard-*.js',
            'assets/js/AuditLog-*.js',
            'assets/js/BookmarkImport-*.js',
            'assets/js/DataManager-*.js',
            'assets/js/MonitoringDashboard-*.js',
            'assets/js/ProfileSettings-*.js',
            'assets/js/RecycleBin-*.js',
            'assets/js/SessionManager-*.js',
            'assets/js/StatsDashboard-*.js',
            'assets/js/SystemHealth-*.js',
            'assets/js/SystemSettings-*.js',
            'assets/js/UserTable-*.js',
            'assets/css/AdminDashboard-*.css',
            'assets/css/AuditLog-*.css',
            'assets/css/BookmarkImport-*.css',
            'assets/css/DataManager-*.css',
            'assets/css/MonitoringDashboard-*.css',
            'assets/css/ProfileSettings-*.css',
            'assets/css/RecycleBin-*.css',
            'assets/css/SessionManager-*.css',
            'assets/css/StatsDashboard-*.css',
            'assets/css/SystemHealth-*.css',
            'assets/css/SystemSettings-*.css',
            'assets/css/UserTable-*.css',
            'assets/js/feedback-core-*.js'
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
            },
            {
              urlPattern: /^https?:\/\/.*\/favicon\.ico(?:\?.*)?$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'starnav-site-favicons',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: '星语导航',
          short_name: 'StarNav',
          description: '您的个性化导航助手',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      }),
      // 生产环境开启 gzip 压缩
      viteCompression({
        verbose: true, // 是否在控制台输出压缩结果
        disable: false, // 是否禁用
        threshold: 10240, // 体积大于 threshold 才会被压缩，单位 b（10KB）
        algorithm: 'gzip', // 压缩算法，可选 ['gzip', 'brotliCompress', 'deflate', 'deflateRaw']
        ext: '.gz', // 生成的压缩包后缀
        deleteOriginFile: false // 压缩后是否删除源文件
      }),
      // 生产环境开启 brotli 压缩
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false
      }),
      // 前端资源预加载优化
      {
        name: 'resource-hints',
        transformIndexHtml(html) {
          return html.replace(
            '</head>',
            `  <link rel="preconnect" href="/api">
  <link rel="dns-prefetch" href="/api">
</head>`
          )
        }
      }
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
              // Vue 核心库
              if (id.includes('vue') && !id.includes('element')) {
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
          drop_console: true, // 移除 console
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
