import Link from 'next/link'
import { HomeIcon, ExternalLinkIcon, RssIcon, MenuIcon } from '@heroicons/react/outline'

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="flex-1">
        <Link href="/">
          <div className="btn btn-ghost btn-sm rounded">
            <HomeIcon className="mr-4 w-5 h-5" />
            <span>Home</span>
          </div>
        </Link>
      </div>

      <div className="flex-none hidden md:flex">
        <div className="flex items-stretch">
          <a href="https://mitscherlich.me" target="_blank" rel="noopener noreferrer">
            <div className="btn btn-ghost btn-sm rounded mr-2">
              Profile
              <ExternalLinkIcon className="ml-2 w-5 h-5" />
            </div>
          </a>
        </div>
        <div className="flex items-stretch">
          <a href="https://github.com/Mitscherlich" target="_blank" rel="noopener noreferrer">
            <div className="btn btn-ghost btn-sm rounded mr-2">
              Github
              <ExternalLinkIcon className="ml-2 w-5 h-5" />
            </div>
          </a>
        </div>
        <div className="flex items-stretch">
          <a href="/feed" target="_blank" rel="noopener noreferrer">
            <div className="btn btn-primary btn-sm rounded">
              RSS
              <RssIcon className="ml-2 w-5 h-5" />
            </div>
          </a>
        </div>
      </div>

      <div className="md:hidden dropdown dropdown-end">
        <div tabIndex={0} className="btn btn-ghost btn-sm">
          <MenuIcon className="w-5 h-5" />
        </div>
        <ul tabIndex={0} className="menu dropdown-content bg-base-100 shadow rounded w-32 mt-24">
          <li>
            <a
              className="flex items-center"
              href="https://mitscherlich.me"
              target="_blank"
              rel="noopener noreferrer"
            >
              Profile
              <ExternalLinkIcon className="ml-2 w-5 h-5" />
            </a>
          </li>
          <li>
            <a
              className="flex items-center"
              href="https://github.com/Mitscherlich"
              target="_blank"
              rel="noopener noreferrer"
            >
              Github
              <ExternalLinkIcon className="ml-2 w-5 h-5" />
            </a>
          </li>
          <li>
            <a className="flex items-center" href="/feed" target="_blank" rel="noopener noreferrer">
              RSS
              <RssIcon className="ml-2 w-5 h-5" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Navbar
