import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    envDir: path.resolve(__dirname, "./"),
    server: {
      port: 8081,
      host: "127.0.0.1",
    },
  },
});
