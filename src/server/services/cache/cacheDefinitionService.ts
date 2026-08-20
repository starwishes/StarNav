export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 600,
  VERY_LONG: 1800
}

export const CacheKeys = {
  bookmarks: (level: number | string) => `bookmarks:level:${level}`,
  categories: () => 'categories:all',
  categoriesSimple: (level: number | string = 0) => `categories:simple:${level}`,
  data: (level: number | string) => `data:level:${level}`,
  search: (level: number | string, keyword: string, limit: number | string) =>
    `search:${level}:${keyword}:${limit}`,
  userInfo: (username: string) => `user:${username}`,
  settings: () => 'settings:all',
  searchEngines: () => 'search_engines:all'
}
