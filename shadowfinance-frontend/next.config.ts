import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Note: headers() is not supported in static export mode
  // FHEVM COOP/COEP headers should be set at server/CDN level
};

export default nextConfig;
