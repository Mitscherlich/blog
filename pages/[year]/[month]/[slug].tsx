import Head from 'next/head'
import { NotionAPI } from 'notion-client'
import { ExtendedRecordMap } from 'notion-types'
import { FC } from 'react'
import { Code, Equation, NotionRenderer } from 'react-notion-x'
import { fetchPostList, getPostView, Post } from 'api/post'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import Pagination, { PaginationType } from 'components/Pagination'
import PostTitle from 'components/PostTitle'
import { formatSlug } from 'utils/slugFormat'

const notion = new NotionAPI()

export const getStaticProps = async ({ params: { slug } }: { params: { slug: string } }) => {
  // Get all posts again
  const posts = await fetchPostList()
  const publishedPosts = posts.filter((post) => post.published)

  // Find the current blog post by slug
  const postIndex = publishedPosts.findIndex((t) => t.slug === slug)
  const post = publishedPosts[postIndex]

  // Get page views from current post
  post.views = await getPostView(formatSlug(post.date, post.slug))

  const pagination: PaginationType = {
    prev: postIndex - 1 >= 0 ? publishedPosts[postIndex - 1] : null,
    next: postIndex + 1 < publishedPosts.length ? publishedPosts[postIndex + 1] : null,
  }

  const recordMap = await notion.getPage(post.id)

  return {
    props: {
      recordMap,
      post,
      pagination,
    },
    revalidate: 60,
  }
}

const BlogPost: FC<{ recordMap: ExtendedRecordMap; post: Post; pagination: PaginationType }> = ({
  recordMap,
  post,
  pagination,
}: {
  recordMap: ExtendedRecordMap
  post: Post
  pagination: PaginationType
}) => {
  if (!post) return null

  // const darkMode = useDarkMode(false, { classNameDark: 'dark-mode' })

  return (
    <>
      <Head>
        <title>{post.name} - Mitscherlich&apos;s Blog</title>
      </Head>

      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto max-w-3xl">
          <Navbar />
        </div>

        <div className="container mx-auto mb-6 md:my-6 px-4 sm:px-6 justify-center flex-grow max-w-3xl bg-base-100 sm:bg-base-200 rounded">
          <div className="my-8">
            <PostTitle post={post} />

            <div className="overflow-hidden md:p-2 sm:bg-base-100 rounded">
              <NotionRenderer
                recordMap={recordMap}
                components={{ code: Code, equation: Equation }}
                // darkMode={darkMode.value}
              />
            </div>

            <Pagination pagination={pagination} />
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

export const getStaticPaths = async () => {
  const posts = await fetchPostList()
  const publishedPosts = posts.filter((post) => post.published)
  return {
    paths: publishedPosts.map(({ date, slug }) => formatSlug(date, slug)),
    fallback: true,
  }
}

export default BlogPost
