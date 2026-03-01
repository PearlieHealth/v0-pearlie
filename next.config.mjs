/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'places.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
    ],
  },
  async redirects() {
    return [
      // /find hub → /london hub
      { source: '/find', destination: '/london', permanent: true },
      // /find/dentist-near-me → new dentist-near-me page
      { source: '/find/dentist-near-me', destination: '/dentist-near-me', permanent: true },
      // Region pages → /london hub
      { source: '/find/central-london', destination: '/london', permanent: true },
      { source: '/find/south-london', destination: '/london', permanent: true },
      { source: '/find/north-london', destination: '/london', permanent: true },
      { source: '/find/west-london', destination: '/london', permanent: true },
      { source: '/find/east-london', destination: '/london', permanent: true },
      // Area pages → matching borough pages
      { source: '/find/harley-street', destination: '/london/westminster', permanent: true },
      { source: '/find/soho', destination: '/london/westminster', permanent: true },
      { source: '/find/mayfair', destination: '/london/westminster', permanent: true },
      { source: '/find/canary-wharf', destination: '/london/tower-hamlets', permanent: true },
      { source: '/find/kensington-chelsea', destination: '/london/kensington-and-chelsea', permanent: true },
      { source: '/find/shoreditch', destination: '/london/hackney', permanent: true },
      { source: '/find/camden', destination: '/london/camden', permanent: true },
      { source: '/find/notting-hill', destination: '/london/kensington-and-chelsea', permanent: true },
      { source: '/find/brixton', destination: '/london/lambeth', permanent: true },
      { source: '/find/clapham', destination: '/london/lambeth', permanent: true },
      { source: '/find/peckham', destination: '/london/southwark', permanent: true },
      { source: '/find/islington', destination: '/london/islington', permanent: true },
      { source: '/find/hampstead', destination: '/london/camden', permanent: true },
      { source: '/find/hammersmith', destination: '/london/hammersmith-and-fulham', permanent: true },
      { source: '/find/stratford', destination: '/london/tower-hamlets', permanent: true },
      // Catch-all for any other /find/* paths
      { source: '/find/:path*', destination: '/london', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
