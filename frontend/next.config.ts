import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",      // required for Docker multi-stage build
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
