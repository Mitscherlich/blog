import type { Block, ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getPageProperty, getTextContent } from 'notion-utils'
import { formatSlug } from '../utils/slugFormat'
import { axiosJson } from '../utils/axios'
import { getNotionPage } from '../utils/notion'

export interface Author {
  id: string
  firstName: string
  lastName: string
  fullName: string
  profilePhoto: string
}

export interface Post {
  id: string
  name: string
  tags: string[]
  published: boolean
  date: string
  slug: string
  author: Author[]
  preview: string
  views: number
}

const NOTION_BLOG_ID = process.env.NOTION_BLOG_ID || 'c0aee12ff2404520861abaae2d4a1fcb'

const DEFAULT_AUTHOR: Author = {
  id: 'mitscherlich',
  firstName: 'Mitscherlich',
  lastName: '',
  fullName: 'Mitscherlich',
  profilePhoto: '/images/avatar.png',
}

/** Normalize Notion API double-wrapped record map entries to the shape react-notion-x expects. */
export function normalizeRecordMap(recordMap: ExtendedRecordMap): ExtendedRecordMap {
  const normalizeMap = <T extends Record<string, any>>(map?: T): T => {
    if (!map) return {} as T
    const next = {} as T
    for (const [id, entry] of Object.entries(map)) {
      if (!entry) continue
      const value = getBlockValue(entry as any)
      if (!value) continue
      ;(next as any)[id] = {
        ...(typeof entry === 'object' ? entry : {}),
        value,
      }
    }
    return next
  }

  return {
    ...recordMap,
    block: normalizeMap(recordMap.block),
    collection: normalizeMap(recordMap.collection as any),
    collection_view: normalizeMap(recordMap.collection_view as any),
    notion_user: normalizeMap(recordMap.notion_user as any),
  }
}

function cleanSlug(raw: string | null | undefined): string {
  return (raw || '').replace(/^\/+|\/+$/g, '').trim()
}

function parseAuthors(
  block: any,
  recordMap: ExtendedRecordMap,
  propertyName = 'author',
): Author[] {
  const collection = getBlockValue(recordMap.collection?.[block.parent_id] as any)
  if (!collection?.schema) return [DEFAULT_AUTHOR]

  const propertyId = Object.keys(collection.schema).find(
    (key) => collection.schema[key]?.name?.toLowerCase() === propertyName.toLowerCase(),
  )
  if (!propertyId) return [DEFAULT_AUTHOR]

  const prop = block.properties?.[propertyId]
  if (!prop) return [DEFAULT_AUTHOR]

  const authors: Author[] = []
  for (const segment of prop) {
    const pointer = segment?.[1]?.[0]
    if (!pointer || pointer[0] !== 'u') continue
    const userId = pointer[1] as string
    const user = getBlockValue(recordMap.notion_user?.[userId] as any) as any
    if (user) {
      authors.push({
        id: userId,
        firstName: user.given_name || '',
        lastName: user.family_name || '',
        fullName: user.name || [user.given_name, user.family_name].filter(Boolean).join(' ') || DEFAULT_AUTHOR.fullName,
        profilePhoto: user.profile_photo || DEFAULT_AUTHOR.profilePhoto,
      })
    } else {
      authors.push({ ...DEFAULT_AUTHOR, id: userId })
    }
  }

  return authors.length > 0 ? authors : [DEFAULT_AUTHOR]
}

function blockToPost(block: any, recordMap: ExtendedRecordMap): Post | null {
  if (!block || block.type !== 'page') return null

  const name =
    (getPageProperty('name', block, recordMap) as string) ||
    getTextContent(block.properties?.title) ||
    ''
  const slug = cleanSlug(getPageProperty('slug', block, recordMap) as string)
  const preview = (getPageProperty('preview', block, recordMap) as string) || ''
  const tags = (getPageProperty('tags', block, recordMap) as string[]) || []
  const publishedRaw = getPageProperty('published', block, recordMap)
  const published =
    publishedRaw === true ||
    publishedRaw === 'Yes' ||
    publishedRaw === 'yes' ||
    publishedRaw === 'true'

  const dateRaw = getPageProperty('date', block, recordMap)
  let date = ''
  if (dateRaw instanceof Date) {
    date = dateRaw.toISOString().slice(0, 10)
  } else if (typeof dateRaw === 'number') {
    date = new Date(dateRaw).toISOString().slice(0, 10)
  } else if (typeof dateRaw === 'string') {
    date = dateRaw.slice(0, 10)
  } else {
    // fallback: parse date property manually
    const collection = getBlockValue(recordMap.collection?.[block.parent_id] as any)
    const dateKey = collection?.schema
      ? Object.keys(collection.schema).find((k) => collection.schema[k]?.type === 'date')
      : undefined
    const dateProp = dateKey ? block.properties?.[dateKey] : undefined
    date = dateProp?.[0]?.[1]?.[0]?.[1]?.start_date || ''
  }

  if (!slug || !name) return null

  return {
    id: block.id,
    name,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    published,
    date,
    slug,
    author: parseAuthors(block, recordMap),
    preview,
    views: 0,
  }
}

export const fetchPostList = async (): Promise<Post[]> => {
  const rawMap = await getNotionPage(NOTION_BLOG_ID)
  const recordMap = normalizeRecordMap(rawMap)

  const collectionId = Object.keys(recordMap.collection || {})[0]
  if (!collectionId) return []

  const viewQueries = recordMap.collection_query?.[collectionId] || {}
  const blockIds = new Set<string>()

  for (const query of Object.values(viewQueries) as any[]) {
    const ids = query?.collection_group_results?.blockIds || query?.blockIds || []
    for (const id of ids) blockIds.add(id)
  }

  // Fallback: all page blocks parented by the collection
  if (blockIds.size === 0) {
    for (const [id, entry] of Object.entries(recordMap.block || {})) {
      const block = getBlockValue(entry) as Block | undefined
      if (block?.type === 'page' && block.parent_id === collectionId) {
        blockIds.add(id)
      }
    }
  }

  const posts: Post[] = []
  for (const id of blockIds) {
    const block = getBlockValue(recordMap.block[id]) as Block | undefined
    const post = blockToPost(block, recordMap)
    if (post) posts.push(post)
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const fetchPostPage = async (pageId: string): Promise<ExtendedRecordMap> => {
  const rawMap = await getNotionPage(pageId)
  return normalizeRecordMap(rawMap)
}

export const getPostView = async (slug: string): Promise<number> => {
  if (!process.env.SPLITBEE_API_TOKEN) {
    return 0 // always return zero if SPLITBEE_API_TOKEN is not provided
  }

  try {
    const {
      data: { count },
    } = await axiosJson.get<{ count: number }>(
      'https://api.splitbee.io/v1/blog.mitscherlich.me/pageviews',
      {
        params: { page: slug },
        headers: { 'x-api-key': process.env.SPLITBEE_API_TOKEN },
      },
    )
    return count
  } catch {
    return 0
  }
}

export const fetchPostListWithViews = async (): Promise<Post[]> => {
  const posts = await fetchPostList()

  return await Promise.all(
    posts.map(async (post) => ({
      ...post,
      views: await getPostView(formatSlug(post.date, post.slug)),
    })),
  )
}
