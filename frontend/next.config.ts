import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=31536000" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
  async redirects() {
    // Route-level redirects for alias paths. Handled by Next at the routing
    // layer so the target page component never has to render just to call
    // redirect() — which was throwing a "negative time stamp" perf error for
    // redirect-only Server Components (e.g. /profile/admin).
    return [
      { source: "/profile", destination: "/dashboard/user?view=profile", permanent: false },
      { source: "/dashboard", destination: "/dashboard/user", permanent: false },
      { source: "/dashboard/resume", destination: "/dashboard/user?view=resume-builder", permanent: false },
      { source: "/dashboard/placement", destination: "/dashboard/user?view=placement-hub", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://adyapan-ai-production.up.railway.app/api/:path*",
      },
    ];
  },
};

export default nextConfig;
