import type { NextConfig } from "next";

const immutableAsset = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*.(glb|hdr|webp|avif|png|jpg|jpeg|svg|woff2)",
        headers: [{ key: "Cache-Control", value: immutableAsset }],
      },
      {
        source: "/dock/:path*",
        headers: [{ key: "Cache-Control", value: immutableAsset }],
      },
    ];
  },
};

export default nextConfig;
