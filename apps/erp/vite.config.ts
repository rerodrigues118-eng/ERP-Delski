import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

const envMjsPlugin = {
  name: "env-mjs-plugin",
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === "/env.mjs" || req.url?.startsWith("/env.mjs?")) {
        res.setHeader("Content-Type", "application/javascript");
        res.end("export default {}; export const env = {};");
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [
    envMjsPlugin,
    tailwindcss(),
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist"),
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    host: "127.0.0.1",
  },
  optimizeDeps: {
    include: ["zustand", "zustand/middleware", "use-sync-external-store/shim/with-selector"],
  },
});
