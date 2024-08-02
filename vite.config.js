import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split rhino3dm wasm file
          rhino3dm: ["rhino3dm"],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["rhino3dm"],
  },
  assetsInclude: ["**/*.3dm"],
});
