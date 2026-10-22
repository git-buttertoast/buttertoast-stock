/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ferlauhakdbfpwfapxxw.supabase.co' }
    ]
  },
  // Stock now lives in Kitchen (22 Oct 2026). The two pages open Kitchen; /api/* keeps
  // working for the pilot (letters, templates). 307 until Stock is retired.
  async redirects() {
    return [
      { source: '/', destination: 'https://experiments.buttertoast.co/people', permanent: false },
      { source: '/print', destination: 'https://experiments.buttertoast.co/stock/documents', permanent: false },
    ]
  },
}
module.exports = nextConfig
