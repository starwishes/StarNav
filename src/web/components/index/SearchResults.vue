<template>
  <div>
    <div
      v-if="searchMode === 'local' && localResults.length > 0 && !loading"
      class="search-results-container"
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

    <div v-if="searchMode === 'online' && suggestions.length > 0" class="search-results-container">
      <div class="suggestion-list">
        <div
          v-for="(sug, index) in suggestions"
          :key="index"
          class="suggestion-item"
          :class="{ active: activeSuggestionIndex === index }"
          @click="$emit('suggestionClick', sug)"
          @mouseenter="$emit('update:activeSuggestionIndex', index)"
        >
          <AppIcon name="icon-md-search" class="suggestion-icon" />
          <span>{{ sug }}</span>
        </div>
      </div>
    </div>

    <div v-if="showEmpty" class="search-results-container empty">
      <div class="sn-empty-state search-empty-state">未找到相关书签</div>
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
import { computed, reactive } from 'vue'
import { Favicon } from '@/config'
import {
  buildIconCandidates,
  buildProxyIconCandidate,
  isRenderableIconUrl,
  markIconUnavailable
} from './siteIconHelpers'

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
@import './SearchResults.scss';
</style>

