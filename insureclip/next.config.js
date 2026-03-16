/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  images: {
    domains: ['heygen-public.s3.amazonaws.com', 'files.heygen.ai'],
  },
}

module.exports = nextConfig
