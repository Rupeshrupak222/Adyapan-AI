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
          {
            // CSP: lock down content sources to own origin + known CDNs used
            // by the app (fonts, avatars, Unsplash images, KaTeX assets).
            // unsafe-inline kept for style-src because Tailwind injects inline
            // styles; remove once a nonce-based approach is in place.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
              // connect-src: allow own origin + the configured backend + all
              // Railway/Vercel deployments so the CSP doesn't break regardless
              // of which deployment URL is active.
              "connect-src 'self' https://*.up.railway.app wss://*.up.railway.app https://*.vercel.app",
              "media-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
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
