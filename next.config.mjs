/** @type {import('next').NextConfig} */

// The three browser-visible settings may be given with or without the
// NEXT_PUBLIC_ prefix (some hosts refuse to store a prefixed value as a secret).
// Either way they are public by design: the publishable key only allows what
// the database's Row Level Security permits.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
const publicEnv = Object.fromEntries(
  Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  }).filter(([, value]) => value)
);

let remotePatterns = [];
if (supabaseUrl) {
  try {
    const { protocol, hostname, port } = new URL(supabaseUrl);
    remotePatterns = [
      { protocol: protocol.replace(':', ''), hostname, port, pathname: '/storage/v1/object/public/**' },
    ];
  } catch {
    // invalid URL: storage images simply won't be optimised
  }
}

const nextConfig = {
  env: publicEnv,
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
