/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained .next/standalone directory for Docker deployments.
  // The standalone server includes all required node_modules and replaces `next start`.
  output: 'standalone',
  transpilePackages: ['@venueplus/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_VENUE_ID: process.env.NEXT_PUBLIC_VENUE_ID ?? '',
    NEXT_PUBLIC_TENANT_SLUG: process.env.NEXT_PUBLIC_TENANT_SLUG ?? '',
  },
}

export default nextConfig
