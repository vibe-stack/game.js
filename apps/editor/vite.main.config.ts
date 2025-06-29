import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // Add 'chokidar' and other Node.js specific modules to external
      // This prevents Vite from trying to bundle them for the browser environment.
      external: [
        "chokidar",
        "electron",
        "fs",
        "path",
        "os",
        "child_process",
        ...(process.env.NODE_ENV !== "production" ? ["esbuild"] : []),
      ],
    },
  },
});
