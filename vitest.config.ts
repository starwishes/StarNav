import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 82,
        lines: 85
      }
    },
    alias: {
      '@': path.resolve(__dirname, './src/web'),
      '@common': path.resolve(__dirname, './src/shared'),
      // node-cron ships sourcemaps that reference missing sources; tests mock it explicitly.
      'node-cron': path.resolve(__dirname, './tests/shims/node-cron.js'),
      'virtual:pwa-register': path.resolve(__dirname, './tests/shims/virtual-pwa-register.js')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/web'),
      '@common': path.resolve(__dirname, './src/shared'),
      'virtual:pwa-register': path.resolve(__dirname, './tests/shims/virtual-pwa-register.js')
    }
  }
})
