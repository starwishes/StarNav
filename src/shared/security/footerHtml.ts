import { normalizeOptionalUrl } from './urlSafety.js'

const BLOCKED_ELEMENT_REGEX =
  /<\s*(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const HTML_COMMENT_REGEX = /<!--[\s\S]*?-->/g
const TOKEN_SPLIT_REGEX = /(<[^>]*>)/g
const TAG_REGEX = /^<\s*(\/?)\s*([a-z0-9]+)([^>]*)\/?\s*>$/i
const ATTRIBUTE_REGEX = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g
const ALLOWED_TAGS = new Set(['a', 'br', 'em', 'p', 'span', 'strong'])
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  lt: '<',
  middot: '·',
  nbsp: ' ',
  quot: '"',
  reg: '®'
}

const escapeHtml = (value: unknown) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const escapeAttribute = (value: string) => escapeHtml(value)

const decodeEntities = (value: string) =>
  String(value)
    .replace(/&#(\d+);/g, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&([a-zA-Z]+);/g, (match, entity: string) => NAMED_ENTITIES[entity] || match)

const readAttribute = (input: string, name: string) => {
  const targetName = name.toLowerCase()
  let match: RegExpExecArray | null

  ATTRIBUTE_REGEX.lastIndex = 0

  while ((match = ATTRIBUTE_REGEX.exec(input))) {
    if (match[1].toLowerCase() !== targetName) {
      continue
    }

    return match[3] || match[4] || match[5] || ''
  }

  return ''
}

const sanitizeTag = (token: string) => {
  const match = token.match(TAG_REGEX)
  if (!match) {
    return null
  }

  return {
    isClosingTag: Boolean(match[1]),
    tagName: match[2].toLowerCase(),
    rawAttributes: match[3] || ''
  }
}

export const sanitizeFooterHtml = (input = ''): string => {
  if (typeof input !== 'string') {
    return ''
  }

  const source = input.replace(BLOCKED_ELEMENT_REGEX, '').replace(HTML_COMMENT_REGEX, '').trim()
  if (!source) {
    return ''
  }

  const openTagStack: string[] = []

  return source
    .split(TOKEN_SPLIT_REGEX)
    .filter(Boolean)
    .map((chunk) => {
      if (!chunk.startsWith('<')) {
        return escapeHtml(decodeEntities(chunk))
      }

      const parsed = sanitizeTag(chunk)
      if (!parsed || !ALLOWED_TAGS.has(parsed.tagName)) {
        return ''
      }

      if (parsed.isClosingTag) {
        if (parsed.tagName === 'br') {
          return ''
        }

        if (openTagStack[openTagStack.length - 1] !== parsed.tagName) {
          return ''
        }

        openTagStack.pop()
        return `</${parsed.tagName}>`
      }

      if (parsed.tagName === 'br') {
        return '<br>'
      }

      if (parsed.tagName !== 'a') {
        openTagStack.push(parsed.tagName)
        return `<${parsed.tagName}>`
      }

      const href = normalizeOptionalUrl(readAttribute(parsed.rawAttributes, 'href'), {
        allowRelative: true
      })
      if (!href) {
        return ''
      }

      const target = readAttribute(parsed.rawAttributes, 'target').toLowerCase()
      const shouldOpenNewTab = target === '_blank'

      openTagStack.push('a')
      return `<a href="${escapeAttribute(href)}"${shouldOpenNewTab ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>`
    })
    .join('')
    .concat(
      // 闭合所有未配对的开放标签（如 `<a href=...>` 缺少 `</a>`），
      // 避免注入的标签吞掉后续整段内容 / 破坏布局
      openTagStack
        .reverse()
        .map((tagName) => `</${tagName}>`)
        .join('')
    )
    .trim()
}
