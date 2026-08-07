import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    envDir: path.resolve(__dirname, "../../"),
    server: {
      port: 8080,
      host: "127.0.0.1",
    },
    optimizeDeps: {
      include: ["zustand", "zustand/middleware", "use-sync-external-store/shim/with-selector"],
    },
  },
});
