export type SearchSuggestionProviderType = 'baidu' | 'google' | 'bing' | 'duckduckgo' | 'brave'

export type FrontendSearchSuggestionProviderType = Exclude<SearchSuggestionProviderType, 'brave'>

export interface SearchSuggestionProviderDefinition {
  type: SearchSuggestionProviderType
  hostnames: string[]
  frontendEnabled: boolean
  buildUrl(keyword: string): string
}

const isHostnameMatch = (hostname: string, baseHostname: string) =>
  hostname === baseHostname || hostname.endsWith(`.${baseHostname}`)

const resolveHostname = (url: string | null | undefined) => {
  if (!url) {
    return null
  }

  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export const SEARCH_SUGGESTION_PROVIDERS: readonly SearchSuggestionProviderDefinition[] =
  Object.freeze([
    {
      type: 'baidu',
      hostnames: ['baidu.com'],
      frontendEnabled: true,
      buildUrl: (keyword: string) =>
        `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword)}&cb=`
    },
    {
      type: 'google',
      hostnames: ['google.com'],
      frontendEnabled: true,
      buildUrl: (keyword: string) =>
        `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}`
    },
    {
      type: 'bing',
      hostnames: ['bing.com'],
      frontendEnabled: true,
      buildUrl: (keyword: string) =>
        `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(keyword)}`
    },
    {
      type: 'duckduckgo',
      hostnames: ['duckduckgo.com'],
      frontendEnabled: true,
      buildUrl: (keyword: string) =>
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(keyword)}&type=list`
    },
    {
      type: 'brave',
      hostnames: ['search.brave.com'],
      frontendEnabled: false,
      buildUrl: (keyword: string) =>
        `https://search.brave.com/api/suggest?q=${encodeURIComponent(keyword)}`
    }
  ])

export const SEARCH_SUGGESTION_PROVIDER_TYPES = Object.freeze(
  SEARCH_SUGGESTION_PROVIDERS.map((provider) => provider.type)
) as readonly SearchSuggestionProviderType[]

export const FRONTEND_SEARCH_SUGGESTION_PROVIDER_TYPES = Object.freeze(
  SEARCH_SUGGESTION_PROVIDERS.filter((provider) => provider.frontendEnabled).map(
    (provider) => provider.type
  )
) as readonly FrontendSearchSuggestionProviderType[]

export const getSearchSuggestionProvider = (
  type: string | null | undefined
): SearchSuggestionProviderDefinition | null => {
  if (typeof type !== 'string' || !type) {
    return null
  }

  return SEARCH_SUGGESTION_PROVIDERS.find((provider) => provider.type === type) || null
}

const resolveSuggestionProviderType = (
  url: string | null | undefined,
  { frontendOnly = false }: { frontendOnly?: boolean } = {}
): SearchSuggestionProviderType | null => {
  const hostname = resolveHostname(url)
  if (!hostname) {
    return null
  }

  const provider =
    SEARCH_SUGGESTION_PROVIDERS.find(
      (candidate) =>
        (!frontendOnly || candidate.frontendEnabled) &&
        candidate.hostnames.some((baseHostname) => isHostnameMatch(hostname, baseHostname))
    ) || null

  return provider?.type || null
}

export const resolveSearchSuggestionProviderTypeFromUrl = (
  url: string | null | undefined
): SearchSuggestionProviderType | null => resolveSuggestionProviderType(url)

export const resolveFrontendSearchSuggestionProviderTypeFromUrl = (
  url: string | null | undefined
): FrontendSearchSuggestionProviderType | null =>
  resolveSuggestionProviderType(url, { frontendOnly: true }) as FrontendSearchSuggestionProviderType | null

export const buildSearchSuggestionUrl = (
  type: string | null | undefined,
  keyword: string
): string | null => {
  const provider = getSearchSuggestionProvider(type)
  if (!provider) {
    return null
  }

  return provider.buildUrl(keyword)
}
