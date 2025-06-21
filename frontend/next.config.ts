import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-hot-toast'],
  },

  // Bundle analyzer setup (can be enabled with ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-analyzer-report.html',
        })
      );
      return config;
    },
  }),

  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Compression
  compress: true,

  // React strict mode
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
