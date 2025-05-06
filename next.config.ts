import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {}, // Changed to an empty object to satisfy the type
    allowedDevOrigins: [
      'https://9003-idx-studio-1746525270584.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev', // Exact match
      'local-origin.dev',
      '*.local-origin.dev'
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
