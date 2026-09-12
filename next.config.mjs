import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the tracing root to this project (a stray parent lockfile confuses inference).
  outputFileTracingRoot: path.resolve(),
};

export default nextConfig;
