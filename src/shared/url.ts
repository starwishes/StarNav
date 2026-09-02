/**
 * URL 规范化与安全清洗 (Shared Module)
 * 适用于: Backend, Frontend, Browser Extension
 */
export const normalizeUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return ''

  // 0. 预处理：移除首尾空格和隐形字符 (零宽空格等)
  let cleanUrl = url.replace(/[\u200b-\u200d\uFEFF\u0000-\u001F\u007F-\u009F]/g, '').trim()

  // 1. 协议补全与检查
  if (!/^https?:\/\//i.test(cleanUrl)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(cleanUrl)) return '' // 拒绝 mailto:/javascript: 等非 HTTP 协议
    if (cleanUrl.includes('://')) return '' // 拒绝非 HTTP 协议
    cleanUrl = 'https://' + cleanUrl
  }

  try {
    const u = new URL(cleanUrl)

    // 2. 协议白名单
    if (!['http:', 'https:'].includes(u.protocol)) return ''

    // 3. 域名规范化 (转小写, 去除尾部点)
    u.hostname = u.hostname.toLowerCase()
    if (u.hostname.endsWith('.')) u.hostname = u.hostname.slice(0, -1)
    if (u.hostname.includes('..')) return '' // 拒绝畸形域名

    // 4. 路径清洗
    let pathname = u.pathname
    // 合并多重斜杠
    while (pathname.includes('//')) pathname = pathname.replace(/\/\//g, '/')
    // 拒绝全是点和斜杠的路径
    if (/^[./]+$/.test(pathname)) pathname = '/'
    // 去除尾部斜杠 (根路径除外)
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    u.pathname = pathname

    // 5. 移除跟踪参数 (参数黑名单)
    // 注意：这会在导入/去重时静默改写用户粘贴的 URL。列表分为两类——
    //   - 明确跟踪参数：utm_*、gclid、fbclid 等，删除几乎无副作用；
    //   - 功能参数：from/ref/source/ts/feature/aid/iid 等，部分站点用作
    //     承载状态（如 ?ref=product 深链、?ts= 缓存键），删除会改变链接含义。
    // 为保持「同一 URL 归一化后一致去重」的核心目标，暂统一删除；如后续
    // 需要保留功能参数，请在此分层处理（STRIP 与 PRESERVE 分开）。
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'gclsrc',
      'dclid',
      'gra',
      'fbclid',
      'igsh',
      'spm',
      'scm',
      'ali_trackid',
      'spm_id_from',
      'vd_source',
      'share_source',
      'share_medium',
      'share_plat',
      'share_tag',
      'bbid',
      'ts',
      'from',
      'isappinstalled',
      'wechat_redirect',
      'iid',
      'aid',
      'utm_id',
      'context_token',
      'ref',
      'source',
      'feature',
      'trk',
      'si',
      'yclid',
      '_openstat'
    ]

    trackingParams.forEach((param) => u.searchParams.delete(param))

    // 移除空的 search (?) 和 hash (#)
    let finalUrl = u.toString()
    if (finalUrl.endsWith('#')) finalUrl = finalUrl.slice(0, -1)
    if (finalUrl.endsWith('?')) finalUrl = finalUrl.slice(0, -1)

    return finalUrl
  } catch {
    return ''
  }
}
