export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300
}

export const CacheKeys = {
  categoriesSimple: (level: number | string = 0) => `categories:simple:${level}`,
  data: (level: number | string) => `data:level:${level}`,
  search: (level: number | string, keyword: string, limit: number | string) =>
    `search:${level}:${keyword}:${limit}`
}
