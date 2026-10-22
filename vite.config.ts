import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      $: resolve(import.meta.dirname, "lib"),
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "lib/index.ts"),
        reactivity: resolve(import.meta.dirname, "lib/reactivity.ts"),
        element: resolve(import.meta.dirname, "lib/element.ts"),
      },
      name: "reago",
    },
  },
  server: { watch: { usePolling: true } },
});
