import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig