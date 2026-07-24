import { describe, expect, it } from 'vitest'

import {
  buildBookmarkImportPayload,
  parseBookmarkHtml,
  type ParsedBookmarkCategory
} from '@/utils/bookmarkImport'

describe('bookmarkImport utils', () => {
  it('parses bookmark html into selectable categories', () => {
    const html = `
      <DL>
        <DT>
          <H3>Dev</H3>
          <DL>
            <DT><A HREF="https://github.com">GitHub</A></DT>
            <DT><A HREF="ftp://invalid.example.com">Invalid</A></DT>
          </DL>
        </DT>
        <DT>
          <H3>Docs</H3>
          <DL>
            <DT><A HREF="https://vuejs.org">Vue</A></DT>
            <DT><A HREF="https://vite.dev">Vite</A></DT>
          </DL>
        </DT>
        <DT>
          <H3>Empty</H3>
          <DL></DL>
        </DT>
      </DL>
    `

    expect(parseBookmarkHtml(html)).toEqual([
      {
        name: 'Dev',
        selected: true,
        items: [{ name: 'GitHub', url: 'https://github.com', description: '' }]
      },
      {
        name: 'Docs',
        selected: true,
        items: [
          { name: 'Vue', url: 'https://vuejs.org', description: '' },
          { name: 'Vite', url: 'https://vite.dev', description: '' }
        ]
      }
    ])
  })

  it('builds import payload from selected categories only', () => {
    const categories: ParsedBookmarkCategory[] = [
      {
        name: 'Dev',
        selected: true,
        items: [{ name: 'GitHub', url: 'https://github.com', description: '' }]
      },
      {
        name: 'Ignored',
        selected: false,
        items: [{ name: 'Skip', url: 'https://skip.example.com', description: '' }]
      }
    ]

    expect(buildBookmarkImportPayload(categories)).toEqual({
      categories: ['Dev'],
      items: [
        {
          name: 'GitHub',
          url: 'https://github.com',
          description: '',
          categoryName: 'Dev'
        }
      ]
    })
  })
})
