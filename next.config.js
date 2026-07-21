const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next-pwa injects a webpack config; production uses `next build --webpack`.
  // Dev uses Turbopack with PWA disabled.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'www.notion.so',
      },
      {
        protocol: 'https',
        hostname: 'file.notion.so',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/posts/index.xml',
        destination: '/feed',
        permanent: true,
      },
      {
        source: '/feed.xml',
        destination: '/feed',
        permanent: true,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
