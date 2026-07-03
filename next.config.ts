import type { NextConfig } from "next";

const buildForElectron = process.env.BUILD_FOR_ELECTRON === "1";

const nextConfig: NextConfig = {
  output: buildForElectron ? "export" : "standalone",
  images: buildForElectron ? { unoptimized: true } : undefined,
  // CRITICAL for Electron: when loading index.html via file://, absolute
  // paths like /_next/static/... don't resolve. Use relative paths so the
  // HTML can find its JS/CSS bundles from any location.
  assetPrefix: buildForElectron ? "./" : undefined,
  trailingSlash: buildForElectron,
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;