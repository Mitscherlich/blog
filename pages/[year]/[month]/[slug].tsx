import Head from 'next/head'
import { GetStaticPaths, GetStaticProps } from 'next'
import { ExtendedRecordMap } from 'notion-types'
import { NotionRenderer } from 'react-notion-x'
import { Code } from 'react-notion-x/third-party/code'
import { Equation } from 'react-notion-x/third-party/equation'
import { fetchPostList, fetchPostPage, getPostView, Post } from 'api/post'
import Footer from 'components/Footer'
import Navbar from 'components/Navbar'
import Pagination, { PaginationType } from 'components/Pagination'
import PostTitle from 'components/PostTitle'
import { formatSlug } from 'utils/slugFormat'

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = context.params?.slug as string

  const posts = await fetchPostList()
  const publishedPosts = posts.filter((post) => post.published)

  const postIndex = publishedPosts.findIndex((t) => t.slug === slug)
  const post = publishedPosts[postIndex]

  if (!post) {
    return { notFound: true, revalidate: 60 }
  }

  post.views = await getPostView(formatSlug(post.date, post.slug))

  const pagination: PaginationType = {
    prev: postIndex - 1 >= 0 ? publishedPosts[postIndex - 1] : null,
    next: postIndex + 1 < publishedPosts.length ? publishedPosts[postIndex + 1] : null,
  }

  const recordMap = await fetchPostPage(post.id)

  return {
    props: {
      recordMap,
      post,
      pagination,
    },
    revalidate: 60,
  }
}

const BlogPost = ({
  recordMap,
  post,
  pagination,
}: {
  recordMap: ExtendedRecordMap
  post: Post
  pagination: PaginationType
}) => {
  if (!post) return null

  return (
    <>
      <Head>
        <title>{`${post.name} - Mitscherlich's Blog`}</title>
      </Head>

      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto max-w-3xl min-[1920px]:max-w-[900px]">
          <Navbar />
        </div>

        <div className="container mx-auto mb-6 md:my-6 px-4 sm:px-6 justify-center flex-grow max-w-3xl min-[1920px]:max-w-[900px] bg-base-100 sm:bg-base-200 rounded">
          <div className="my-8">
            <PostTitle post={post} />

            <div className="overflow-hidden md:p-2 sm:bg-base-100 rounded [--notion-max-width:100%]">
              <NotionRenderer
                recordMap={recordMap}
                fullPage={false}
                darkMode={false}
                disableHeader
                components={{
                  Code,
                  Equation,
                }}
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

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await fetchPostList()
  const publishedPosts = posts.filter((post) => post.published)
  return {
    paths: publishedPosts.map(({ date, slug }) => formatSlug(date, slug)),
    // Avoid client fallback tree differing from SSG HTML during hydration
    fallback: 'blocking',
  }
}

export default BlogPost
