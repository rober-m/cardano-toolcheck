import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile sits one level up at /home/roberm/IOG).
  turbopack: { root: __dirname },
  // Fully static export — every route is pre-rendered to HTML at build time.
  // The site reads all content from /data/*.json and makes no runtime server calls.
  output: "export",
  // Static export cannot use the default (server) image optimizer.
  images: { unoptimized: true },
  // Emit /tools/aiken/index.html etc. so it hosts cleanly on any static host.
  trailingSlash: true,
};

export default nextConfig;
