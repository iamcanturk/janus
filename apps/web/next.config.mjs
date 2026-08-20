/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@janus/core', '@janus/checks'],
  reactStrictMode: true,
};

export default nextConfig;
