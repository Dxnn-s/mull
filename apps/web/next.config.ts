import type { NextConfig } from 'next';

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const nextConfig: NextConfig = {
  transpilePackages: ['@mull/core'],
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: { root: resolve(dirname(fileURLToPath(import.meta.url)), '../..') },
};

export default nextConfig;
