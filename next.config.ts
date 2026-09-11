import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a minimal self-contained server bundle
  // (no need for node_modules at runtime) — used by the Dockerfile.
  output: "standalone",
};

export default nextConfig;
