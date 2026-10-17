/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
