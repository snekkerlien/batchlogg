/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/brewery/:path*",
        destination: "/business/:path*",
        permanent: true,
      },
    ];
  },

  experimental: {
    appDir: false
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cvwydrbrxbvezyhvtfma.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
