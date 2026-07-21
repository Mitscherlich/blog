import { NotionAPI } from 'notion-client'
import type { ExtendedRecordMap } from 'notion-types'
import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici'

const PROXY_URL =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy ||
  process.env.ALL_PROXY ||
  process.env.all_proxy

let dispatcher: Dispatcher | undefined
if (PROXY_URL) {
  try {
    dispatcher = new ProxyAgent(PROXY_URL)
  } catch (error) {
    console.warn('[notion] failed to init proxy agent:', PROXY_URL, error)
  }
}

/**
 * undici/global fetch does not honor HTTP(S)_PROXY env vars.
 * When a local proxy is configured (common in CN), route Notion requests through it.
 */
const proxyAwareFetch: typeof fetch = (input, init) => {
  if (dispatcher) {
    return undiciFetch(input as any, {
      ...(init as any),
      dispatcher,
    }) as unknown as Promise<Response>
  }
  return fetch(input, init)
}

const notion = new NotionAPI({
  // ofetchOptions is forwarded into ofetch; cast to allow custom fetch (proxy support)
  ofetchOptions: {
    // undici/global fetch ignores HTTP(S)_PROXY — inject proxy-aware fetch
    fetch: proxyAwareFetch,
    // Notion loadPageChunk is flaky under concurrent SSG / slow networks
    timeout: 60_000,
    retry: 4,
    retryDelay: 1000,
  } as any,
})

type CacheEntry<T> = {
  expires: number
  data: T
  inflight?: Promise<T>
}

const pageCache = new Map<string, CacheEntry<ExtendedRecordMap>>()

// Dev: longer cache to avoid hammering Notion on every refresh.
// Prod: align with ISR revalidate (60s) as a soft soft-cache.
const CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 5 * 60_000 : 55_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientError(error: unknown): boolean {
  const message = String((error as any)?.message || error || '')
  const code = String(
    (error as any)?.cause?.code ||
      (error as any)?.cause?.cause?.code ||
      (error as any)?.code ||
      '',
  )
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_BODY_TIMEOUT' ||
    /fetch failed|timeout|ECONN|ETIMEDOUT|socket hang up|network/i.test(message)
  )
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const retryable = isTransientError(error)
      if (!retryable || i === attempts - 1) break
      const delay = 800 * 2 ** i + Math.floor(Math.random() * 200)
      console.warn(
        `[notion] ${label} failed (${i + 1}/${attempts}), retry in ${delay}ms:`,
        (error as any)?.message || error,
      )
      await sleep(delay)
    }
  }
  throw lastError
}

export async function getNotionPage(pageId: string): Promise<ExtendedRecordMap> {
  const key = pageId.replace(/-/g, '')
  const now = Date.now()
  const cached = pageCache.get(key)

  if (cached && cached.expires > now) {
    return cached.data
  }

  // Deduplicate concurrent requests for the same page
  if (cached?.inflight) {
    return cached.inflight
  }

  const inflight = withRetry(`getPage(${pageId})`, () =>
    notion.getPage(pageId, {
      // Lower concurrency to reduce loadPageChunk timeouts
      concurrency: 1,
      fetchMissingBlocks: true,
      fetchCollections: true,
      signFileUrls: true,
      throwOnCollectionErrors: false,
    }),
  )
    .then((data) => {
      pageCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
      return data
    })
    .catch((error) => {
      // Keep serving stale data if we have any
      if (cached?.data) {
        console.warn(`[notion] getPage(${pageId}) failed, serving stale cache`)
        pageCache.set(key, { data: cached.data, expires: Date.now() + CACHE_TTL_MS })
        return cached.data
      }
      pageCache.delete(key)
      throw error
    })

  pageCache.set(key, {
    data: cached?.data as ExtendedRecordMap,
    expires: cached?.expires || 0,
    inflight,
  })

  return inflight
}

export function clearNotionCache() {
  pageCache.clear()
}
