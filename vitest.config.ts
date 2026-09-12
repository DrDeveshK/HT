import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests hit the local SQLite DB; Prisma resolves this path
    // relative to prisma/schema.prisma, i.e. prisma/dev.db (the seeded DB).
    env: { DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db" },
  },
});
