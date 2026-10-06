import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  cacheDir: process.env.CLIK_VITE_CACHE_DIR,
  // Three's source modules let Rollup keep the renderer out of pages that only use its math.
  resolve: {
    alias: [{ find: /^three$/, replacement: "three/src/Three.js" }],
    dedupe: ["three", "react", "react-dom"],
  },
  plugins: [
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
