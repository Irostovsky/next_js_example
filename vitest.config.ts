import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    setupFiles: ["./tests/setup.ts"],
    env: {
      DB_PATH: ":memory:",
      BETTER_AUTH_SECRET: "test-secret-must-be-32-characters-long",
    },
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    server: {
      deps: {
        inline: ["zod"],
      },
    },
  },
});
