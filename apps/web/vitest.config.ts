import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      // Exercise the browser Provider while keeping the SDK mockable as an ES module.
      "@posthog/react": fileURLToPath(
        new URL(
          "./node_modules/@posthog/react/dist/esm/index.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    server: { deps: { inline: ["@posthog/react"] } },
  },
});
