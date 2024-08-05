import { defineConfig } from "vite";

export default defineConfig({
  assetsInclude: ["**/*.3dm", "**/*.glb", "**/*.gltf"],
  optimizeDeps: { exclude: ["recast-navigation"] },
});
