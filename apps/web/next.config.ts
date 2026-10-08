import type { NextConfig } from "next";

const apiProxyTarget = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Windows development environments may not permit the symlinks used while
  // copying standalone traces. Containers keep the production default.
  output: process.env.NEXT_DISABLE_STANDALONE === "true" ? undefined : "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`
      }
    ];
  }
};

export default nextConfig;

