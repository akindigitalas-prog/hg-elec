/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      'playwright-core',
      '@sparticuz/chromium',
      'chromium-bidi',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('electron');
    }

    config.module.rules.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    });

    return config;
  },
};

module.exports = nextConfig;

