
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  api: { // This is for Pages Router API routes or general API handling
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  serverActions: { // Specific configuration for Server Actions
    bodySizeLimit: '10mb', // Increase limit for Server Actions
  },
};

export default nextConfig;
