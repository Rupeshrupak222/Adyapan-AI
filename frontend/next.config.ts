import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache dynamic page shells client-side for 30s so repeat navigations
    // render instantly instead of hitting the server on every click.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
