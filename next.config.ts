import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    /* Allow /images_to_use/ local static paths — served from public/ */
    localPatterns: [
      { pathname: "/images_to_use/**" },
    ],
  },
};

export default nextConfig;
