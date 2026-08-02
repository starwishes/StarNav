import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/store/admin'
import type { Item, Category } from '@/types'
import { useSiteProjection } from './useSiteProjection'

export function useSiteFilter(moveState?: { active: boolean }) {
  const { t } = useI18n()
  const adminStore = useAdminStore()
  const { categoryTree } = useSiteProjection()

  const collectItems = (categories: Category[]): Item[] =>
    categories.flatMap((category) => [
      ...(category.content || []),
      ...collectItems(category.children || [])
    ])

  const filteredData = computed<Category[]>(() => {
    const visitorLevel = adminStore.user?.level || 0

    // 递归过滤函数
    const filterTree = (cats: Category[]): Category[] => {
      return cats
        .map((cat) => {
          // 1. 过滤分类本身内容
          const items = (cat.content || []).filter((item) => {
            if (item.level !== undefined && item.level > visitorLevel) return false
            return true
          })

          // 2. 递归过滤子分类
          const children = filterTree(cat.children || [])

          return {
            ...cat,
            content: items,
            children: children
          }
        })
        .filter((cat) => {
          // 3. 分类准入检查
          // 拖拽模式且是管理员则全显
          if (moveState && moveState.active && adminStore.isAuthenticated) return true
          // 权限检查
          if (cat.level !== undefined && cat.level > visitorLevel) return false
          return true
        })
    }

    const filtered = filterTree(categoryTree.value)

    // 提取置顶项
    const pinnedItems = collectItems(filtered)
      .filter((item) => item.pinned)
      .map((item) => {
        const pinnedReplica = { ...item, level: item.level || 0 } as Item & {
          _isPinnedReplica?: boolean
        }
        pinnedReplica._isPinnedReplica = true
        return pinnedReplica
      })

    if (pinnedItems.length > 0) {
      return [
        {
          id: -1,
          name: t('site.pinnedCategory'),
          content: pinnedItems,
          isVirtual: true,
          children: []
        } as Category,
        ...filtered
      ]
    }
    return filtered
  })

  return {
    filteredData
  }
}
