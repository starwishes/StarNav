<template>
  <div>
    <div
      v-if="searchMode === 'local' && localResults.length > 0 && !loading"
      class="search-results-container"
      aria-live="polite"
    >
      <div class="search-results">
        <ul>
          <li v-for="item in localResults" :key="item.id">
            <button
              type="button"
              class="site inherit-text result-button"
              @click="$emit('itemClick', item.url)"
            >
              <div class="site-card">
                <div class="img-group">
                  <img
                    v-if="getIconSrc(item)"
                    :src="getIconSrc(item)"
                    class="result-avatar"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    @error="markBroken(item)"
                  />
                  <div v-else class="result-avatar placeholder">{{ getInitial(item.name) }}</div>
                </div>
                <div class="text-group">
                  <div class="name text">{{ item.name }}</div>
                  <div class="name text describe">{{ item.description }}</div>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="searchMode === 'online' && suggestions.length > 0"
      class="search-results-container"
      aria-live="polite"
    >
      <div class="suggestion-list" role="listbox" :aria-label="t('search.suggestionsLabel')">
        <div
          v-for="(sug, index) in suggestions"
          :key="index"
          class="suggestion-item"
          :class="{ active: activeSuggestionIndex === index }"
          role="option"
          :aria-selected="activeSuggestionIndex === index"
          @click="$emit('suggestionClick', sug)"
          @mouseenter="$emit('update:activeSuggestionIndex', index)"
        >
          <AppIcon name="icon-md-search" class="suggestion-icon" />
          <span>{{ sug }}</span>
        </div>
      </div>
    </div>

    <div v-if="showEmpty" class="search-results-container empty">
      <div class="sn-empty-state search-empty-state">{{ t('search.noResults') }}</div>
    </div>

    <div v-if="loading" class="loading search-results-container">
      <div class="loading-list">
        <div v-for="i in 2" :key="i" class="loading-row">
          <span class="loading-avatar"></span>
          <div class="loading-copy">
            <span class="loading-line is-short"></span>
            <span class="loading-line"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useI18n } from 'vue-i18n'
import { computed, reactive } from 'vue'
import { Favicon } from '@/config'
import {
  buildIconCandidates,
  buildProxyIconCandidate,
  isRenderableIconUrl,
  markIconUnavailable
} from './siteIconHelpers'

const { t } = useI18n()

export interface SearchResultItem {
  id: number
  name: string
  description: string
  url: string
  categoryId: number
  createTime?: string
  icon?: string
  clickCount?: number
  categoryName?: string
}

const props = defineProps<{
  searchMode: 'local' | 'online'
  localResults: SearchResultItem[]
  suggestions: string[]
  loading: boolean
  hasSearched: boolean
  searchText: string
  activeSuggestionIndex: number
}>()

defineEmits<{
  (e: 'itemClick', url: string): void
  (e: 'suggestionClick', suggestion: string): void
  (e: 'update:activeSuggestionIndex', index: number): void
}>()

const brokenIconIndexes = reactive<Record<number, number>>({})

const showEmpty = computed(() => {
  return (
    props.hasSearched &&
    !props.loading &&
    props.localResults.length === 0 &&
    props.searchMode === 'local' &&
    props.searchText.trim()
  )
})

const getProxyIcon = (item: SearchResultItem) => buildProxyIconCandidate(item.url, Favicon)

const getIconCandidates = (item: SearchResultItem) =>
  buildIconCandidates(item.url, item.icon || '', getProxyIcon(item))

const getIconSrc = (item: SearchResultItem) => {
  const iconIndex = brokenIconIndexes[item.id] || 0
  const iconCandidates = getIconCandidates(item)
  const candidate = iconCandidates[iconIndex] || ''
  return isRenderableIconUrl(candidate) ? candidate : ''
}

const markBroken = (item: SearchResultItem) => {
  const currentIndex = brokenIconIndexes[item.id] || 0
  const iconCandidates = getIconCandidates(item)

  if (currentIndex < iconCandidates.length - 1) {
    brokenIconIndexes[item.id] = currentIndex + 1
    return
  }

  if (iconCandidates.length > 0) {
    markIconUnavailable(item.url, item.icon || '', getProxyIcon(item))
  }

  brokenIconIndexes[item.id] = iconCandidates.length
}

const getInitial = (name: string) => {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?'
}
</script>

<style scoped lang="scss">
.search-results-container {
  position: absolute;
  top: calc(100% + 16px);
  left: 0;
  right: 0;
  padding: 16px;
  max-height: 420px;
  overflow-y: auto;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(29, 29, 31, 0.08);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.16);
  z-index: 90;

  &.empty {
    padding: 22px;
  }

  &.loading {
    padding: 18px;
  }
}

.search-results ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.site {
  display: block;
  text-decoration: none;
  color: inherit;
}

.result-button {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
}

.site-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 70px;
  margin-bottom: 8px;
  padding: 14px 16px;
  border-radius: 20px;
  background: #f5f5f7;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    background: #fff;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
  }
}

.img-group {
  flex-shrink: 0;
}

.result-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  object-fit: contain;
  display: block;
  background: rgba(29, 29, 31, 0.06);

  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(29, 29, 31, 0.56);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
}

.text-group {
  flex: 1;
  min-width: 0;
}

.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1d1d1f;
}

.name.text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.name.describe {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 400;
  color: rgba(29, 29, 31, 0.58);
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  color: #1d1d1f;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    transform 0.18s ease;

  &:hover,
  &.active {
    background: #f5f5f7;
    transform: translateX(2px);
  }
}

.suggestion-icon {
  width: 16px;
  height: 16px;
  color: rgba(29, 29, 31, 0.46);
  flex-shrink: 0;
}

.search-empty-state {
  color: rgba(29, 29, 31, 0.58);
}

.loading-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.loading-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(29, 29, 31, 0.06), rgba(29, 29, 31, 0.12));
}

.loading-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.loading-line {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(29, 29, 31, 0.06), rgba(29, 29, 31, 0.12));

  &.is-short {
    width: 42%;
  }
}

:global(:root[data-theme-preset='cinema'] .search-results-container) {
  background: rgba(24, 24, 27, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.42);
}

:global(:root[data-theme-preset='cinema'] .site-card),
:global(:root[data-theme-preset='cinema'] .suggestion-item:hover),
:global(:root[data-theme-preset='cinema'] .suggestion-item.active) {
  background: rgba(255, 255, 255, 0.06);
}

:global(:root[data-theme-preset='cinema'] .name),
:global(:root[data-theme-preset='cinema'] .suggestion-item),
:global(:root[data-theme-preset='cinema'] .search-empty-state) {
  color: #f5f5f7;
}

:global(:root[data-theme-preset='cinema'] .name.describe),
:global(:root[data-theme-preset='cinema'] .suggestion-icon) {
  color: rgba(255, 255, 255, 0.6);
}

:global(:root[data-theme-preset='cinema'] .result-avatar) {
  background: rgba(255, 255, 255, 0.08);
}

:global(:root[theme-mode='dark'] .search-results-container) {
  background: color-mix(
    in srgb,
    var(--ui-panel-surface, rgba(15, 23, 42, 0.94)) 94%,
    rgba(var(--ui-theme-rgb), 0.06) 6%
  );
  border-color: var(--ui-panel-border, rgba(148, 163, 184, 0.18));
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.34);
}

:global(:root[theme-mode='dark'] .site-card),
:global(:root[theme-mode='dark'] .suggestion-item:hover),
:global(:root[theme-mode='dark'] .suggestion-item.active) {
  background: rgba(255, 255, 255, 0.06);
}

:global(:root[theme-mode='dark'] .name),
:global(:root[theme-mode='dark'] .suggestion-item),
:global(:root[theme-mode='dark'] .search-empty-state) {
  color: var(--ui-text-primary, #f8fafc);
}

:global(:root[theme-mode='dark'] .name.describe),
:global(:root[theme-mode='dark'] .suggestion-icon) {
  color: rgba(226, 232, 240, 0.6);
}

:global(:root[theme-mode='dark'] .result-avatar) {
  background: rgba(255, 255, 255, 0.08);
}

:global(:root[theme-mode='dark'] .loading-avatar),
:global(:root[theme-mode='dark'] .loading-line) {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.16));
}
</style>
