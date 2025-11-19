import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/**',
        search: '',
      },
      {
        pathname: '/api/icon',
        search: '?url=*',
      },
      {
        pathname: '/api/**',
        search: '**',
      }
    ],
  },
};

export default nextConfig;
