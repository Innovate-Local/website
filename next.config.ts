import type { NextConfig } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  // Deployed on Vercel (was a static export on GitHub Pages). Dropping
  // `output: 'export'` lets server-side code — like the /api/students route
  // handler — run as a real serverless function.
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  reactStrictMode: true,
}

export default nextConfig
