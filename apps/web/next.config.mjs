/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@janus/core', '@janus/checks', '@janus/tools', '@janus/report'],
  reactStrictMode: true,
};

export default nextConfig;
