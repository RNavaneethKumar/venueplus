/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@venueplus/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_VENUE_ID: process.env.NEXT_PUBLIC_VENUE_ID ?? '',
  },
}

export default nextConfig
