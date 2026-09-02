/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    appDir: false
  },

  images: {
    domains: ["cvwydrbrxbvezyhvtfma.supabase.co"]
  },
};

module.exports = nextConfig;
