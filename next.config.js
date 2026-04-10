const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    turbo: {
      root: path.join(__dirname),
    },
  },
}

module.exports = nextConfig
