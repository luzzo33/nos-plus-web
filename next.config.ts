import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { createRequire } from 'module';

const SEO_MODE = process.env.SEO_MODE ?? process.env.NEXT_PUBLIC_SEO_MODE ?? 'beta';

const SEO_LIVE_BASE_URL =
  process.env.SEO_LIVE_BASE_URL ?? process.env.NEXT_PUBLIC_SEO_LIVE_BASE_URL ?? 'https://nos.plus';

const SEO_BETA_BASE_URL =
  process.env.SEO_BETA_BASE_URL ??
  process.env.NEXT_PUBLIC_SEO_BETA_BASE_URL ??
  'https://beta.nos.plus';

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  distDir: process.env.DIST_DIR || '.next',
  turbopack: {},
  experimental: {},
  serverExternalPackages: ['@tanstack/react-query', 'next-auth'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nosana.com',
        pathname: '/**',
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  env: {
    NEXT_PUBLIC_SEO_MODE: SEO_MODE,
    NEXT_PUBLIC_SEO_LIVE_BASE_URL: SEO_LIVE_BASE_URL,
    NEXT_PUBLIC_SEO_BETA_BASE_URL: SEO_BETA_BASE_URL,
  },

  webpack: (config, { isServer }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = config.resolve.alias ?? {};
    config.resolve.alias['@tanstack/react-query'] = require.resolve('@tanstack/react-query');

    if (isServer) {
      config.output = config.output ?? {};
      config.output.chunkFilename = '[name].js';
      config.output.hotUpdateMainFilename = '[runtime].hot-update.json';
      config.output.hotUpdateChunkFilename = '[id].hot-update.js';
    }
    return config;
  },
};

export default createNextIntlPlugin()(nextConfig);
