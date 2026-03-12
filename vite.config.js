import { defineConfig } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "config-lan",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/config.js")) {
            const lanPath = resolve(process.cwd(), "public/config.lan.js");
            if (existsSync(lanPath)) {
              const content = readFileSync(lanPath, "utf-8");
              res.setHeader("Content-Type", "application/javascript");
              res.end(content);
              return;
            }
          }
          next();
        });
      },
    },
  ],
});
