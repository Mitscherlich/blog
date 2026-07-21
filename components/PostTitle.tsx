import { CalendarIcon, EyeIcon, TagIcon } from '@heroicons/react/24/outline'
import { Post } from '../api/post'

const PostTitle = ({ post }: { post: Post }) => {
  return (
    <div className="mb-8 mt-4 px-3">
      <div className="flex flex-wrap">
        {(post.tags ?? []).map((tag) => (
          <div className="badge badge-primary mr-1" key={tag}>
            <div className="flex items-center space-x-1 ">
              <TagIcon className="w-4 h-4" /> <span>{tag}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-2xl font-bold my-3">{post.name}</div>

      <div className="text-sm text-neutral flex flex-nowrap items-center space-x-2 overflow-hidden">
        <div className="flex items-center space-x-1">
          <CalendarIcon className="w-5 h-5" />
          <span>{new Date(post.date).toLocaleDateString('zh-CN')}</span>
        </div>
        <span>·</span>

        <div className="flex items-center space-x-1">
          <EyeIcon className="w-5 h-5" />
          <span>{post.views}</span>
        </div>
        <span>·</span>

        {(post.author ?? []).map((author) => (
          <div key={author.id} className="flex items-center space-x-1 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={author.profilePhoto} alt="profile photo" className="w-6 h-6 rounded-full" />
            <span className="hidden md:block">{author.fullName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PostTitle
