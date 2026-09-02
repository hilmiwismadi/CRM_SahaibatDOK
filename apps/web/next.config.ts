import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // @sahaibat/shared ships raw TS source (npm workspace symlink) — Next.js
  // doesn't transpile node_modules by default, so whitelist it explicitly.
  transpilePackages: ["@sahaibat/shared"],
  // Explicit monorepo root: Turbopack's lockfile auto-detection is fragile
  // inside the Docker build stage (which doesn't copy the root lockfile),
  // so point it at the workspace root directly.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
