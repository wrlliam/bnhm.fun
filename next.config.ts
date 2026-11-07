import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Let phones/laptops on the same network load the dev server via this machine's
// LAN IP (Next only allows localhost by default, which blocks JS for everyone else).
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  allowedDevOrigins: [
    ...lanHosts,
    "*.local",
    // extra hosts, e.g. your LAN IP when the dev server runs inside Docker
    ...(process.env.ALLOWED_DEV_ORIGINS ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
