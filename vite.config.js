import path from "node:path";
import { defineConfig } from "vite";

const clientRoot = path.resolve(__dirname, "client");

export default defineConfig({
  root: clientRoot,
  resolve: {
    alias: {
      "@": path.resolve(clientRoot, "src"),
      "@vendor": path.resolve(clientRoot, "src/vendor")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "client/index.html"),
      output: {
        manualChunks: (id) => {
          if (id.includes("/client/src/traffic/")) {
            return "traffic";
          }
          if (id.includes("/client/src/overlays/")) {
            return "overlays";
          }
          if (id.includes("node_modules/maplibre-gl")) {
            return "maplibre";
          }
          return undefined;
        }
      }
    }
  }
});
