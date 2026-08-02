import type { ImportedBookmarkItem } from '@/types'

export interface ParsedBookmarkItem {
  name: string
  url: string
  description: string
}

export interface ParsedBookmarkCategory {
  name: string
  items: ParsedBookmarkItem[]
  selected: boolean
}

export const parseBookmarkHtml = (html: string): ParsedBookmarkCategory[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const categories: ParsedBookmarkCategory[] = []

  const folders = doc.querySelectorAll('DT')

  folders.forEach((dt) => {
    const heading = dt.querySelector(':scope > H3')
    if (!heading) {
      return
    }

    const folderName = heading.textContent?.trim() || '未命名分类'
    const items: ParsedBookmarkItem[] = []
    const list = dt.querySelector(':scope > DL')

    if (list) {
      const links = list.querySelectorAll(':scope > DT > A')

      links.forEach((anchor) => {
        const name = anchor.textContent?.trim() || ''
        const url = anchor.getAttribute('href') || ''

        if (name && url && url.startsWith('http')) {
          items.push({
            name,
            url,
            description: ''
          })
        }
      })
    }

    if (items.length > 0) {
      categories.push({
        name: folderName,
        items,
        selected: true
      })
    }
  })

  return categories
}

export const buildBookmarkImportPayload = (categories: ParsedBookmarkCategory[]) => {
  const selectedCategories = categories.filter((category) => category.selected)

  return {
    categories: selectedCategories.map((category) => category.name),
    items: selectedCategories.flatMap((category) =>
      category.items.map<ImportedBookmarkItem>((item) => ({
        ...item,
        categoryName: category.name
      }))
    )
  }
}
