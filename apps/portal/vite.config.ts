import { defineConfig } from "@lovable.dev/vite-tanstack-config";
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
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [envMjsPlugin],
    envDir: path.resolve(__dirname, "../../"),
    server: {
      port: 8081,
      host: "127.0.0.1",
    },
  },
});
