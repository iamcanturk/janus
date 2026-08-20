/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@janus/core', '@janus/checks', '@janus/tools'],
  reactStrictMode: true,
};

export default nextConfig;
