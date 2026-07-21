import Head from 'next/head'
import { fetchPostListWithViews, Post } from '../api/post'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

export async function getStaticProps() {
  const posts = await fetchPostListWithViews()

  return {
    props: {
      posts,
    },
    revalidate: 60,
  }
}

function HomePage({ posts }: { posts: Post[] }) {
  return (
    <>
      <Head>
        <title>Mitscherlich&apos;s Blog</title>
      </Head>

      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto max-w-3xl min-[1920px]:max-w-[900px]">
          <Navbar />
        </div>

        <div className="container mx-auto mb-6 md:my-6 px-4 sm:px-6 justify-center flex-grow max-w-3xl min-[1920px]:max-w-[900px] bg-base-200 rounded">
          <div className="my-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-24 h-24 rounded-full object-cover ring ring-base-300 ring-offset-base-100 ring-offset-2"
              src="/images/avatar.png"
              alt="avatar"
            />
            <div className="mt-8 text-2xl font-bold">Mitscherlich&apos;s Blog</div>

            <div className="mt-12 leading-loose flex flex-col space-y-4">
              {posts.map((post) => post.published && <PostCard key={post.id} post={post} />)}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

export default HomePage
