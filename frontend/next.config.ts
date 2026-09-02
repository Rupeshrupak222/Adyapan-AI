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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://checkout.razorpay.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://upload.wikimedia.org https://cdn.jsdelivr.net",
              "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://*.up.railway.app wss://*.up.railway.app https://*.vercel.app https://cdn.jsdelivr.net https://api.razorpay.com https://lumberjack.razorpay.com",
              "media-src 'self'",
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
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
