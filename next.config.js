/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ferlauhakdbfpwfapxxw.supabase.co' }
    ]
  }
}
module.exports = nextConfig
