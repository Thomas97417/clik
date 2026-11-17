import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

const cacheDir = process.env.CLIK_VITE_CACHE_DIR || "node_modules/.vite";

export default defineConfig({
  cacheDir,
  // Three's source modules let Rollup keep the renderer out of pages that only use its math.
  resolve: {
    alias: [{ find: /^three$/, replacement: "three/src/Three.js" }],
    dedupe: ["three", "react", "react-dom"],
  },
  plugins: [
    // Cached TanStack modules contain imports into cacheDir. Vite hashes plugin
    // names but omits cacheDir, so include it to keep each React runtime separate.
    { name: `clik:deps-cache:${cacheDir}`, apply: "serve" },
    tsconfigPaths(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      server: { entry: "server.ts" },
      router: { quoteStyle: "double", semicolons: true },
    }),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});
