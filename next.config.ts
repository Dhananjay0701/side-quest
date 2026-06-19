import type { NextConfig } from "next";
import path from "path";

function assetRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "**.supabase.co" },
    { protocol: "https", hostname: "images.unsplash.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
  ];

  const assetsBase = process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
  if (assetsBase) {
    try {
      const url = new URL(assetsBase);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "https" | "http",
        hostname: url.hostname,
        pathname: "/**",
      });
    } catch {
      /* ignore invalid URL */
    }
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL;
  if (appBase) {
    try {
      const url = new URL(appBase);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "https" | "http",
        hostname: url.hostname,
        pathname: "/cdn/**",
      });
    } catch {
      /* ignore */
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: assetRemotePatterns(),
    localPatterns: [
      { pathname: "/images_to_use/**" },
      { pathname: "/cdn/**" },
    ],
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
