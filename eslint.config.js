import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import globals from 'globals'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,ts,tsx,vue}']
  },

  {
    name: 'app/ignores',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/tests/performance/**']
  },

  // Browser globals for Frontend
  {
    files: ['src/web/**/*.{js,ts,vue}', 'src/shared/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  },

  // Node globals for Backend/Scripts
  {
    files: [
      'server.ts',
      'src/server/**/*.{js,ts}',
      'scripts/**/*.{js,ts}',
      '*.config.{js,ts,cjs,mjs}',
      'tests/**/*.{js,ts}'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },

  // WebExtensions globals
  {
    files: ['clients/extension/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    }
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  skipFormatting,

  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': 'warn',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-useless-catch': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-undef': 'error' // Keep for JS files
    }
  },

  // Disable no-undef for TypeScript files (TS compiler handles this)
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-undef': 'off'
    }
  }
]
