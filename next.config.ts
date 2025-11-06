import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl"],
  experimental: {
    // Disable strict CSP for client components that use dynamic imports
    turbo: {
      resolveAlias: {
        '@mapbox/mapbox-gl-draw': '@mapbox/mapbox-gl-draw',
      },
    },
  },
};

// Backend API: https://echoapp-backend-production.up.railway.app
export default nextConfig;
